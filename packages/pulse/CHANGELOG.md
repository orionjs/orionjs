# @orion-js/pulse

## 4.5.16

### Patch Changes

- Add durable per-topic batch receivers to Pulse and Echoes. Pulse materializes ordered event arrays
  as one transactionally cursor-safe delivery, executes each array as one worker invocation, and
  retries, heartbeats, fences, and acknowledges the complete batch. Echoes adds `createEchoBatchEvent`
  and `@EchoBatchEvent` for Pulse-only bulk handlers, while updated normal handlers remain compatible
  with multi-event deliveries during hot rollouts. Remove the obsolete public history query API while
  retaining bounded attempt outcomes on each delivery.

## 4.5.15

### Patch Changes

- Simplify event discovery to use only MongoDB sequence cursors and retire temporal discovery indexes.

## 4.5.14

### Patch Changes

- e92cdc9: Remove the execution-version and ordering selectors. Pulse now uses one delivery-resident execution model for every listener, with atomic claims, retries, outcomes, and bounded attempt history stored on each delivery. Echoes removes the corresponding event and subscription options.

## 4.5.13

### Patch Changes

- 4ec34ab: Remove the standalone Pulse dashboard, its CLI and browser assets, dashboard-only indexes, and all dashboard build dependencies.

## 4.5.12

### Patch Changes

- d902d1a: Stop polling the legacy execution path after version 1 work has drained from version 2 subscriptions, while retaining periodic indexed rollout safety audits.

## 4.5.11

### Patch Changes

- 7e1711b: Add opt-in embedded execution for unordered Pulse subscriptions. Version 2 keeps queue state,
  leases, retries, and completed attempts atomically on delivery documents, while bridge-capable
  workers continue draining version 1 and version 2 deliveries during rolling deployments. Echoes can
  select the execution version per listener.

## 4.5.10

### Patch Changes

- Optimize completed-delivery cleanup by selecting candidates per topic and deleting the selected IDs directly, avoiding large cross-topic cursor queries during backlog cleanup.

## 4.5.9

### Patch Changes

- Allow ordering to be configured per event listener, default new subscriptions to unordered delivery, and safely evolve persisted settings with `configVersion`. Move recovery maintenance out of the backlog hot loop, reconcile through partial-indexed markers, and clean successful deliveries only after their persisted cursor and retention state make deletion safe.

## 4.5.8

### Patch Changes

- Use indexed status counts in the dashboard instead of grouping entire collections.

## 4.5.7

### Patch Changes

- Persist Pulse dashboard filters, pagination, topology selection, and open record details in shareable URLs.

## 4.5.6

### Patch Changes

- Add a topic-focused topology dashboard and persist publisher identities automatically.

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
