---
'@orion-js/echoes': patch
'@orion-js/pulse': patch
---

Allow Pulse ordering to be configured per Echoes event listener with `ordered`, overriding the global subscription default for that topic. Pulse subscriptions now default to unordered delivery and support integer `configVersion` values so higher-version persisted settings win safely across deployments. Runtime recovery is also scheduled independently from backlog processing and uses partial-indexed repair markers instead of repeatedly scanning healthy deliveries.
