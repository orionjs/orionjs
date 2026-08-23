# Dogs scheduler architecture

`startWorkers()` starts one scheduler loop. `workersCount` is the maximum number of concurrent
job executions for that scheduler; it no longer creates persistent worker loops.

## Acquisition loop

```text
while scheduler is running
  while active executions are below workersCount
    calculate job names with available per-job capacity
    atomically claim the next job from the current partition

    if every partition has been checked without a successful claim
      wait pollInterval
      continue

    start an ephemeral execution and track it by executionId

  if capacity is full or all job names are locally saturated
    wait until an execution finishes or becomes stale
```

There is at most one unsuccessful query per configured partition before `pollInterval`, regardless
of `workersCount`. Each scheduler starts with a shuffled partition order, advances after every
attempt, and reshuffles after every full sweep. Claims always use `partition = currentPartition`;
they never query multiple partitions with `$in`.

`nPartitions` defaults to `1`. Event and recurrent records receive a random partition when they are
created. Priority remains strict inside a partition and approximate across partitions.

One reconciler per `startWorkers()` instance repairs runnable records whose partition is missing,
negative, or outside the configured range. It skips active locks, processes 500 records at a time,
and uses compare-and-set updates so it cannot move a job after a claim wins. It runs once at startup,
continues with short pauses while migration work remains, and checks again periodically with jitter.

`cooldownPeriod` is deprecated and ignored. The scheduler waits only when there is no eligible job,
when all concurrency slots are occupied, or when every job name has reached its local parallelism
limit.

## Adaptive acquisition hint

Each `startWorkers()` instance keeps its selected MongoDB hint only in memory. It starts with
`{partition: 1, jobName: 1, priority: -1, nextRunAt: 1}` and compares it with
`{partition: 1, priority: -1, nextRunAt: 1}`. Both indexes are declared by `JobsRepo`; the scheduler
assumes they already exist and does not add a migration or index-detection path.

The comparison runs immediately in the background and then every 30 minutes, without jitter or
overlap. It uses every configured job name and the same eligibility selector and sort as the real
claim. Each cycle alternates three `find().sort().limit(1).explain('executionStats')` calls per hint
on the primary, with a one-second maximum execution time.

The hint with the lower median `executionTimeMillis` wins. A tie keeps the current hint. The startup
probe applies its winner immediately; later probes require the other hint to win twice
consecutively before switching. A current-hint win, tie, failure, or timeout resets that streak.
Failures retain the current hint and are retried at the next interval.

Both acquisition indexes start with `partition`. The selected hint is used while every configured
job name has local capacity. If
`maxParallelExecutionsPerServer` filters one or more event job names from a claim, that claim uses
`{partition: 1, jobName: 1, priority: -1, nextRunAt: 1}`. This temporary override does not change the
selected hint or affect later probes; claims return to the selected hint as soon as no job names are
filtered.

Rolling deployments keep the previous unpartitioned indexes until every application instance runs
the partition-aware version. After rollout and reconciliation, remove only
`jobName_1_priority_-1_nextRunAt_1` and `priority_-1_nextRunAt_1` to eliminate their write
amplification.

Instances with no configured jobs do not run probes. `stop()` cancels a scheduled probe and waits
for an explain already in flight; after that explain returns, the rest of its incomplete cycle is
discarded.

## Execution state

The scheduler owns two internal maps:

- Active executions consume global and per-job capacity.
- Stale executions remain observed until their promises settle, but do not consume capacity.

When a lock expires, the execution becomes terminally stale, emits a warning, writes one stale
history record, releases its capacity, and cannot mutate the job record afterward. A late success or
error only cleans up the detached promise.

## Lock ownership

Every atomic claim writes its generated `executionId` into `lockId`. Updates that belong to an
execution match both `_id` and `lockId`, including lock extension, retry scheduling, recurrent
rescheduling, max-tries handling, priority changes, and event-job deletion.

This fencing prevents an old stale execution from changing a job that has already been claimed by a
new execution.

## Shutdown and public API

`stop()` stops new acquisitions, wakes the scheduler, and waits for active lock-owning executions.
It does not wait indefinitely for detached stale promises. If a MongoDB acquisition was already in
flight when `stop()` was called, that acquired job is executed and included in the shutdown wait.

`workersCount` remains the public concurrency setting. `nPartitions` independently controls how
many index regions schedulers rotate through. All application instances must use the same value;
Dogs intentionally stores no cluster metadata for this setting. `WorkerInstance` and
`WorkersInstance.workers` are removed because there are no persistent workers. A read-only
`runningExecutions` count exposes current active capacity usage without exposing the internal maps.

`maxParallelExecutionsPerServer` retains its existing effective scope: each `startWorkers()` instance
tracks its own per-job limit.
