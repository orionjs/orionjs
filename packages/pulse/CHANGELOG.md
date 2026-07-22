# @orion-js/pulse

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
