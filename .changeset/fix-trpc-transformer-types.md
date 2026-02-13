---
"@orion-js/trpc": patch
---

Fix transformer type propagation so frontend clients can use `transformer: superjson` on tRPC links without type casts when `trpcOptions.transformer` is configured on the server.
