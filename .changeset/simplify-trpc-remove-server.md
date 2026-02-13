---
"@orion-js/trpc": patch
---

Simplify package: remove startTRPC, buildRouter, createTRPC. Users now call initTRPC/t.router() directly for native transformer type propagation. Package focuses on procedure helpers (createTQuery, createTMutation, createTPaginatedQuery), decorators, and merge utilities. Exports defaultErrorFormatter for easy reuse with custom tRPC instances.
