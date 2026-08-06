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
    offsetReset: 'latest',
    delivery: 'at-least-once',
    maxRetries: 3,
  },
)

const event = await pulse.publish({
  topic: 'order.created',
  data: {orderId: 'order-1'},
  headers: {source: 'checkout'},
})

console.log(event.id)
```

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
| `pollIntervalMs` | 3000 | Polling and reconciliation interval. |
| `workerCount` | 4 | Maximum concurrent handler executions in this process. |
| `maxPoolSize` | 5 | Maximum MongoDB application connections per server for this Pulse client. |
| `lockTimeoutMs` | 30000 | Distributed lease duration. Active handlers renew it automatically. |
| `discoveryLockTimeoutMs` | 10000 | Discovery-leader lease duration. Controls replica failover independently from handler locks. |
| `onError` | `console.error` | Receives internal coordinator and worker errors. |

Connection initialization creates and validates every collection index automatically, including TTL indexes. `awaitConnection()`, `publish()`, `subscribe()`, and history reads do not resolve until those indexes are ready.

Pulse intentionally lowers the MongoDB driver's `maxPoolSize` default from 100 to 5. The driver
keeps `minPoolSize` at 0, so it creates application connections on demand instead of opening all
five eagerly. Increase `maxPoolSize` only when a replica needs more concurrent MongoDB operations;
requests wait for an available connection when the pool is full.

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
| `ordered` | `true` | Prevent callbacks from overlapping for this consumer group and topic. |
| `offsetReset` | `latest` | First subscription starts at `latest` or the earliest retained event. |
| `delivery` | `at-least-once` | Can also be `at-most-once`. |
| `maxRetries` | 3 | Retries after the initial attempt. At-most-once always uses zero. |
| `retryDelayMs` | 1000 | Delay before the first retry. |
| `retryBackoffMultiplier` | 2 | Produces default delays of 1, 2, and 4 seconds. |
| `maxConcurrency` | worker count | Per-process topic concurrency when `ordered` is false. |

Subscription behavior is persisted by `consumerGroup + topic`. Replicas must declare matching ordering, offset, delivery, and retry options. Calling `unsubscribe()` stops local processing but preserves the durable offset; subscribing again resumes from it.

## Delivery and recovery

Pulse stores an execution history record with `status: 'pending'` before invoking a handler. Acquiring it adds a UUIDv7 fencing token and renewable lock. A pending record can therefore be classified as queued, active, or expired.

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

Polling and reconciliation are the only discovery and recovery mechanisms. Pulse works with
standalone MongoDB, replica sets, and sharded clusters without opening Change Streams. Tune
`pollIntervalMs` to balance idle query volume and delivery latency.

`changeStreams` is not a supported connection option. Remove it from existing configurations
before upgrading. Pulse rejects the legacy field at startup, including `changeStreams: 'disabled'`,
so a stale deployment cannot suggest that a Change Stream mode is still available.
