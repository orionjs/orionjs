# `@orion-js/pulse`

Pulse is a distributed, recoverable pub/sub system backed only by MongoDB. It provides durable
consumer groups, concurrent delivery, retries, polling, and crash recovery
without a separate broker.

## Install

```bash
pnpm add @orion-js/pulse mongodb
```

## Connect

```ts
import {connect} from '@orion-js/pulse'

const pulse = connect({
  connectionString: process.env.MONGO_URL!,
  databaseName: 'app',
  consumerGroup: 'billing-service',
})

await pulse.awaitConnection()
```

`databaseName` may be omitted when it is already present in the connection string.

## Publish

```ts
await pulse.publish({
  topic: 'orders.created',
  data: {orderId: 'order-123'},
  headers: {traceId: 'trace-456'},
})
```

Each event is stored once. Pulse creates execution deliveries for every subscribed consumer group.

## Subscribe

```ts
const subscription = await pulse.subscribe(
  'orders.created',
  async event => {
    console.log(event.id, event.data, event.attempt)
  },
  {
    offsetReset: 'latest',
    maxConcurrency: 8,
    maxRetries: 5,
    retryDelayMs: 1_000,
    retryBackoffMultiplier: 2,
  },
)
```

Deliveries are independent and may run concurrently. `maxConcurrency` limits concurrent callbacks
for one topic in one process; `workerCount` limits them across the entire Pulse instance. Atomic
MongoDB fencing prevents two replicas from owning the same attempt at the same time.

## Batch receivers

Use a distinct batch handler when one callback should process multiple events together:

```ts
await pulse.subscribeBatch(
  'invoices.created',
  async events => {
    await insertInvoices(events.map(event => event.data))
  },
  {
    configVersion: 2,
    batchSize: 100,
    maxConcurrency: 2,
  },
)
```

`batchSize` is a maximum. Pulse does not wait to fill a batch: if 23 events are available, the
handler receives 23 immediately. One batch handler invocation consumes one worker, and one delivery
stores the ordered event IDs for that invocation. Batch subscriptions require MongoDB transactions,
which are available on replica sets, sharded clusters, and Atlas.

## Subscription options

| Option | Default | Description |
| --- | --- | --- |
| `configVersion` | `0` | Integer version of persisted settings. Higher versions win. |
| `offsetReset` | `latest` | Start at retained history or only process newly published events. |
| `delivery` | `at-least-once` | Use `at-most-once` to disable retries after a handler starts. |
| `maxRetries` | `3` | Retries after the first failed attempt. |
| `retryDelayMs` | `1000` | Initial retry delay. |
| `retryBackoffMultiplier` | `2` | Exponential retry multiplier. |
| `maxConcurrency` | `workerCount` | Per-process concurrency for this topic. |

`subscribeBatch()` additionally requires a positive integer `batchSize`.

Pulse persists subscription settings per `consumerGroup + topic`. Increase `configVersion` when
changing persisted settings. A replica with a lower version adopts the stored higher version;
different settings at the same version fail fast.

## Execution model

Queue state, retry state, the active lease, terminal outcome, and a bounded window of completed
attempts are stored atomically on the delivery document. The handler is invoked only after its
attempt has been durably claimed.

Pulse renews active leases while handlers run. If a process disappears, the discovery leader reaps
the expired delivery lock and either schedules its retry or marks it terminal. Every mutation is
fenced with the attempt lock token, so a stale worker cannot acknowledge work after losing its
lease.

Pulse retains at most ten completed attempt records per delivery. `historyRetentionMs` controls the
TTL applied when a delivery becomes terminal; `null` disables that TTL.

## Delivery cleanup

The discovery leader periodically deletes terminal successful deliveries in batches after the
persisted discovery cursor has passed their event. When retention is enabled, cleanup only selects
deliveries that already have `expiresAt`, preserving the retention contract. MongoDB TTL remains the
fallback for terminal deliveries not removed by this cleanup.

## Polling and recovery

Pulse uses indexed polling. When a coordinator finds work it continues immediately; when idle it
waits for `pollIntervalMs`. Expired-lock reaping and successful-delivery cleanup run on their own
schedules and only from the discovery leader, outside the handler hot loop.

## Retention

```ts
const pulse = connect({
  connectionString: process.env.MONGO_URL!,
  databaseName: 'app',
  consumerGroup: 'billing-service',
  eventRetentionMs: 7 * 24 * 60 * 60 * 1000,
  historyRetentionMs: 7 * 24 * 60 * 60 * 1000,
})
```

- `eventRetentionMs` controls event TTL.
- `historyRetentionMs` controls terminal delivery and attempt-history TTL.
- Set either value to `null` to disable that TTL.

## Close

```ts
await pulse.close()
```

`close()` stops new work, waits for active handlers, releases discovery leases, and closes the
MongoDB client. Calling it from inside a handler starts graceful shutdown without deadlocking the
active callback.
