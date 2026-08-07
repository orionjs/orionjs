# @orion-js/pulse

## 4.5.5

### Patch Changes

- Index dashboard event, history, and delivery queries to avoid collection scans and in-memory sorts.

## 4.5.4

### Patch Changes

- Bound Pulse to one MongoDB application connection per server by default, expire idle pool connections, and expose the idle timeout through Echoes.

## 4.5.3

### Patch Changes

- Reduce dashboard MongoDB load by pausing hidden views, preferring secondary reads, bounding queries with configurable timeouts, and indexing pending delivery monitoring.

## 4.5.2

### Patch Changes

- Reduce MongoDB load by coordinating discovery and work polling once per process, with fair topic batching, stronger lease fencing, and recovery coverage.

## 4.5.1

### Patch Changes

- 2b9f41a: Reduce MongoDB load with one polling coordinator per process, renewable discovery leadership,
  batched recovery, and handler-only worker concurrency. Remove Change Streams and their public
  configuration entirely, add a separate discovery lease timeout, and avoid ordered-lease writes
  while retries are delayed.

## 4.5.0

### Minor Changes

- Align this package with the coordinated OrionJS 4.5 release.

## 4.4.3

### Patch Changes

- 335b969: Harden concurrent delivery and disaster recovery with MongoDB-assigned event ordering, atomic local concurrency limits, fair topic scheduling, crash-safe history retention, deadlock-free handler shutdown, hostile error serialization, stricter runtime option validation, and semantic unique-index validation.

## 4.4.2

### Patch Changes

- b10fdca: Limit the default MongoDB connection pool to five connections per Pulse client and expose `maxPoolSize` as a connection option.

## 4.4.1

### Patch Changes

- Add Pulse, a MongoDB-backed distributed event system with durable consumer groups, retries, crash recovery, delivery history, and a monitoring dashboard.

## Unreleased

- Add the `orion-pulse dashboard` CLI and standalone Node.js monitoring server.
- Add a compiled React dashboard for system health, throughput, topics, consumer groups, events,
  deliveries, attempts, locks, payloads, and durable subscriptions.
- Keep dashboard UI dependencies build-only so importing Pulse does not load dashboard code.
- Query MongoDB directly through read-only dashboard endpoints.

## 4.4.0

### Minor Changes

- Add MongoDB-backed pub/sub with typed topics and consumer groups.
- Add ordered and concurrent delivery, retries, fencing locks, and crash recovery.
- Add durable attempt history with pending, success, and error states.
- Create and validate all MongoDB indexes automatically, including TTL indexes.
