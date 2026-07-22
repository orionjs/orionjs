# @orion-js/pulse

Pulse is a distributed, recoverable pub/sub system backed only by MongoDB. It supports consumer groups, ordered or concurrent delivery, retries, durable execution history, polling recovery, and optional MongoDB Change Streams.

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
| `--no-open` | disabled | Do not open the browser automatically. |

## Connection options

| Option | Default | Description |
| --- | --- | --- |
| `connectionString` | required | MongoDB connection string. |
| `consumerGroup` | required | Replicas sharing this value compete for each delivery. |
| `databaseName` | database in URI | MongoDB database. Pulse fails if neither is present. |
| `collectionPrefix` | `orionjs.pulse` | Prefix for the four Pulse collections. |
| `changeStreams` | `auto` | `auto`, `required`, or `disabled`. Polling always remains enabled. |
| `eventRetentionMs` | 7 days | Event retention, or `null` to disable expiration. |
| `historyRetentionMs` | 7 days | Completed delivery/history retention, or `null`. |
| `pollIntervalMs` | 3000 | Polling and reconciliation interval. |
| `workerCount` | 4 | Maximum worker loops in this process. |
| `lockTimeoutMs` | 30000 | Distributed lease duration. Active handlers renew it automatically. |
| `onError` | `console.error` | Receives internal worker and Change Stream errors. |

Connection initialization creates and validates every collection index automatically, including TTL indexes. `awaitConnection()`, `publish()`, `subscribe()`, and history reads do not resolve until those indexes are ready.

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

At-least-once delivery can invoke a handler again when the machine dies after an external side effect but before recording success. Use `event.id` as an idempotency key for external writes.

Ordered subscriptions block later events while the current event is running or waiting for a retry. Concurrent subscriptions lock deliveries independently.

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

## MongoDB topology

Polling and reconciliation are the source of correctness and work with standalone MongoDB. In `auto` mode, Pulse enables Change Streams on replica sets and sharded clusters to reduce delivery latency. Change Streams only wake workers; missed notifications do not lose events.
