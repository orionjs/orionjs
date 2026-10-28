---
'@orion-js/http': patch
'@orion-js/graphql': patch
'@orion-js/echoes': patch
'@orion-js/telemetry': patch
'@orion-js/file-manager': patch
---

Security release: update vulnerable dependencies. `http` moves to express ~4.22.3 and body-parser
~1.20.9. `graphql` moves to Apollo Server 5 through `@as-integrations/express4` and now requires
graphql ^16.11.0. `echoes` moves to serialize-javascript ^7.1.4; the wire format is unchanged.
`telemetry` moves to OpenTelemetry SDK 0.223 (core 2.x). `file-manager` replaces aws-sdk v2 with
`@aws-sdk/client-s3` v3.
