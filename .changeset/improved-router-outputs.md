---
"@orion-js/trpc": patch
---

fix(trpc): add InferRouterOutputs type for correct paginated query type inference

- Export `InferRouterOutputs<TRouter>` type that correctly infers output types for paginated queries
- tRPC's built-in `inferRouterOutputs` returns `unknown` for complex generic types like `PaginatedResponse<TItem>`
- The new type properly extracts output types by accessing the router's internal procedure record
- Also exports `InferRouterInputs` for convenience alongside the new type
