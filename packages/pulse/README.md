# @orion-js/pulse

Pulse is a distributed, recoverable pub/sub system backed only by MongoDB. It supports consumer groups, ordered or concurrent delivery, retries, durable execution history, polling, and crash recovery.

Pulse has no runtime dependency on OrionJS. MongoDB is a peer dependency, and every MongoDB document ID is generated as a UUIDv7 string.

Read the [complete Pulse documentation](https://orionjs.com/overview/other-modules/pulse/introduction) for publishing, consumer configuration, crash recovery, operations, and the API reference.

## Installation

```bash
bun add @orion-js/pulse mongodb
```

## Usage

```typescript
import {connect} from '@orion-js/pulse'

type Events = {
  'order.created': {
    orderId: string
  }
}

const pulse = connect<Events>({
  connectionString: process.env.MONGODB_URI!,
  consumerGroup: 'billing',
  // Optional when the connection string already contains a database.
  databaseName: 'app',
})

// connect() returns immediately while initialization continues in the background.
// Await it during service startup to fail early.
await pulse.awaitConnection()

await pulse.subscribe(
  'order.created',
  async event => {
    console.log(event.id, event.data.orderId, event.attempt)
  },
  {
    ordered: true,
    configVersion: 1,
    offsetReset: 'latest',
    delivery: 'at-least-once',
    maxRetries: 3,
  },
)

const event = await pulse.publish({
  topic: 'order.created',
  data: {orderId: 'order-1'},
  headers: {traceId: 'trace-1'},
})

console.log(event.id, event.publisher) // billing
```

Every published event stores the connection's `consumerGroup` as its `publisher`. Subscribers
receive the same value, so services can trace who emitted an event without adding a manual header.

Call `await pulse.close()` during graceful shutdown.

## Monitoring dashboard

Pulse ships with a self-contained, read-only monitoring dashboard:

```bash
bunx orion-pulse dashboard "$MONGO_URL"
```

The database can be included in the URI or provided explicitly:

```bash
bunx orion-pulse dashboard "$MONGO_URL" \
  --database app \
  --prefix orionjs.pulse \
  --port 4111
```

The command starts a Node.js process and opens `http://127.0.0.1:4111`. Use `--no-open` to
prevent the browser from opening or `--host` to change the bind address.

The dashboard includes:

- System health, MongoDB latency, error rate, oldest pending delivery, and lock health.
- Published, successful, and failed throughput over configurable time windows.
- Per-topic and per-consumer-group delivery state.
- Paginated explorers for events, deliveries, attempts, and durable subscriptions.
- Filtering for statuses and queued, active, or expired locks.
- Event payload, headers, retry errors, lease state, and execution timing details.
- Five-second live refresh, manual refresh, responsive layouts, and light/dark themes.

Every value is queried directly from the four Pulse MongoDB collections. The dashboard does not
load an OrionJS application, import service code, or call Pulse runtime APIs. Its HTTP API accepts
only reads and rejects mutation methods.

The current dashboard's counters and attempt explorer describe execution version 1. Monitor
`v2-*` delivery states directly in MongoDB during a version 2 rollout; `pulse.history.find()` already
projects recent version 2 attempts.

React, Vite, Tailwind CSS, and dashboard components are used only at package build time. The
compiled frontend lives under `assets/dashboard`, while the CLI launches `node assets/dashboard.js`.
Importing `@orion-js/pulse` in an application does not load the dashboard server or browser assets
into memory.

Dashboard options:

| Option | Default | Description |
| --- | --- | --- |
| MongoDB URI | `MONGO_URL`, `MONGODB_URI`, or `DATABASE_URL` | First positional argument or environment variable. |
| `-d, --database` | database in URI | Database to inspect. |
| `-p, --port` | `4111` | Dashboard HTTP port; use `0` for an ephemeral port. |
| `--host` | `127.0.0.1` | Network interface to bind. |
| `--prefix` | `orionjs.pulse` | Pulse collection prefix. |
| `--query-timeout-ms` | `30000` | Maximum time for each MongoDB dashboard operation. |
| `--no-open` | disabled | Do not open the browser automatically. |

Dashboard reads use `secondaryPreferred` and fall back to the primary only when a secondary is not
available. Queries and network waits time out after thirty seconds by default. The dashboard server
does not cache results.

## Connection options

| Option | Default | Description |
| --- | --- | --- |
| `connectionString` | required | MongoDB connection string. |
| `consumerGroup` | required | Replicas sharing this value compete for each delivery. |
| `databaseName` | database in URI | MongoDB database. Pulse fails if neither is present. |
| `collectionPrefix` | `orionjs.pulse` | Prefix for the four Pulse collections. |
| `eventRetentionMs` | 7 days | Event retention, or `null` to disable expiration. |
| `historyRetentionMs` | 7 days | Completed delivery/history retention, or `null`. |
| `pollIntervalMs` | 3000 | Idle coordinator polling interval. |
| `workerCount` | 4 | Maximum concurrent handler executions in this process. |
| `maxPoolSize` | 1 | Maximum MongoDB application connections per server for this Pulse client. |
| `maxIdleTimeMS` | 30000 | Close application connections after this much idle time; `0` disables expiry. |
| `lockTimeoutMs` | 30000 | Distributed lease duration. Active handlers renew it automatically. |
| `discoveryLockTimeoutMs` | 10000 | Discovery-leader lease duration. Controls replica failover independently from handler locks. |
| `onError` | `console.error` | Receives internal coordinator and worker errors. |

Connection initialization creates and validates every collection index automatically, including TTL indexes. `awaitConnection()`, `publish()`, `subscribe()`, and history reads do not resolve until those indexes are ready.

Pulse intentionally lowers the MongoDB driver's `maxPoolSize` default from 100 to 1 and sets
`minPoolSize: 0`. Handlers do not retain the connection while user code runs, so concurrent
callbacks still execute normally; only their short MongoDB coordination operations share the
socket. Pulse also sets `maxIdleTimeMS: 30000`, allowing extra sockets from an explicitly larger
pool to close after bursts. Increase `maxPoolSize` only after observing local pool contention.

Each Pulse process has one MongoDB coordinator regardless of `workerCount`. The coordinator performs
one work-poll query across all locally subscribed topics, then distributes returned candidates to
the worker slots. Replicas share renewable discovery leases per `consumerGroup + topic`; every
process acquires and renews its leases in bulk and discovers all topics it owns with one aggregate
query. Idle polling therefore scales with processes, not processes multiplied by topics, while
replicas with intentionally different topic sets remain safe. Discovery uses bounded polling only;
Pulse does not open MongoDB Change Streams or persistent event cursors.
Discovery leases default to 10 seconds so a dead leader can be replaced promptly without shortening
the separate lock used by long-running handlers.

Discovery cursor writes carry the topic's fencing token. A stale reader that finishes a query after
losing leadership cannot move the cursor; its idempotent delivery writes can safely be repeated by
the replacement reader.

New events also receive an internal MongoDB BSON timestamp during publication. Pulse uses this
server-assigned sequence for durable discovery, so concurrent publishers and skewed application
clocks cannot leave an event behind an advanced subscription cursor. Ordered consumers use that
same sequence; legacy events without one fall back to `createdAt + eventId` and remain readable
through an independent cursor while old and new publishers coexist.

Subscriptions created before Pulse 4.4.3 may initially have only the legacy cursor. Keep completed
delivery history at least as long as retained events during that one-time upgrade scan. If an old
delivery row has already expired, at-least-once semantics allow the retained event to run again.

## Subscription options

| Option | Default | Description |
| --- | --- | --- |
| `ordered` | `false` | Set to true to prevent callbacks from overlapping for this consumer group and topic. |
| `configVersion` | `0` | Integer version for persisted settings. A higher version atomically replaces a lower one. |
| `executionVersion` | `1` | Set to `2` for embedded delivery attempts on unordered high-throughput listeners. |
| `offsetReset` | `latest` | First subscription starts at `latest` or the earliest retained event. |
| `delivery` | `at-least-once` | Can also be `at-most-once`. |
| `maxRetries` | 3 | Retries after the initial attempt. At-most-once always uses zero. |
| `retryDelayMs` | 1000 | Delay before the first retry. |
| `retryBackoffMultiplier` | 2 | Produces default delays of 1, 2, and 4 seconds. |
| `maxConcurrency` | worker count | Per-process topic concurrency when `ordered` is false. |

Subscription behavior is persisted by `consumerGroup + topic`. Replicas at the same
`configVersion` must declare matching ordering, offset, delivery, and retry options. A higher
version atomically replaces a lower one; a lower version adopts the persisted winner and cannot
downgrade it. Legacy documents and omitted versions are treated as version zero. Calling
`unsubscribe()` stops local processing but preserves the durable offset; subscribing again resumes
from it.

Execution version 2 is an opt-in architecture for unordered consumers. It claims, retries, recovers,
and completes attempts atomically on the delivery document instead of writing the physical history
collection. Deploy the bridge-capable package everywhere while leaving the default version 1, then
set `executionVersion: 2` with a higher `configVersion` on selected topics. Bridge workers drain both
formats during the rollout. Read the
[hot rollout guide](https://orionjs.com/blog/pulse-embedded-execution) before enabling it in
production.

Version 2 retains the most recent 10 attempt outcomes on each delivery and keeps the exact total in
the delivery's attempt counter. This bounds MongoDB document size even when `maxRetries` is large.

## Delivery and recovery

Execution version 1 stores a history record with `status: 'pending'` before invoking a handler.
Version 2 stores the equivalent pending state on its delivery. Acquiring either form adds a UUIDv7
fencing token and renewable lock, so pending work can be classified as queued, active, or expired.

If a process or machine disappears, another replica marks the expired attempt as `error` with code `worker_lost`. At-least-once delivery creates the next attempt; at-most-once delivery finishes with an error. A stale worker cannot acknowledge after losing its fencing token.

Graceful `close()` stops new work while continuing to heartbeat handlers already in progress. It
waits for those callbacks before closing MongoDB, avoiding unnecessary recovery retries during
normal deploy shutdowns. A handler may initiate and await `close()` without deadlocking; lifecycle
code outside the handler can call it again to await the shared close promise.

At-least-once delivery can invoke a handler again when the machine dies after an external side effect but before recording success. Use `event.id` as an idempotency key for external writes.

Ordered subscriptions block later events while the current event is running or waiting for a retry. Concurrent subscriptions lock deliveries independently.

Non-terminal errored attempts are kept without `expiresAt`, even when their retry delay exceeds
`historyRetentionMs`. Pulse applies retention to all completed attempts only after their delivery
becomes terminal, and reconciliation repairs a crash between the terminal and TTL writes.

## History

```typescript
const result = await pulse.history.find({
  topic: 'order.created',
  status: 'pending',
  lockState: 'expired',
  limit: 100,
})

for (const attempt of result.records) {
  console.log(attempt.eventId, attempt.attempt, attempt.error)
}
```

`history.find()` supports `topic`, `eventId`, `consumerGroup`, `status`, `lockState`, `from`, `to`, `cursor`, and `limit`. Lock state is `queued`, `active`, or `expired` for pending attempts.

## Polling

Polling is the discovery mechanism, and indexed reconciliation markers provide crash recovery.
Pulse works with standalone MongoDB, replica sets, and sharded clusters without opening Change
Streams. Tune `pollIntervalMs` to balance idle query volume and delivery latency.

Maintenance does not run on every coordinator iteration while a backlog is draining. Expired
attempts are checked on a bounded cadence derived from `lockTimeoutMs`, without searching the
collection for the next deadline, and reconciliation runs at most every 30 seconds unless a full
batch of 25 repairs remains. Cross-collection writes temporarily set
`needsReconciliation`; partial indexes keep these recovery queries proportional to incomplete
writes instead of the total number of deliveries or history records.

The discovery leader also removes completed `success` deliveries in periodic batches after the
persisted sequenced or legacy cursor has reached them. When retention is enabled, cleanup requires
the delivery's `expiresAt` marker so history retention is known to have been applied first. With
`historyRetentionMs: null`, cleanup does not require that marker. This maintenance path never reads
the history collection.

`changeStreams` is not a supported connection option. Remove it from existing configurations
before upgrading. Pulse rejects the legacy field at startup, including `changeStreams: 'disabled'`,
so a stale deployment cannot suggest that a Change Stream mode is still available.
