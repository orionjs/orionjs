# @orion-js/trpc

## 4.0.10

### Patch Changes

- - Add configurable tRPC server options in `startTRPC`, including `trpcOptions` support for transformers like SuperJSON.
  - Improve example backend integration and docs for SuperJSON setup.
  - Fix package prepare/build behavior for local workspace installs.
- Updated dependencies
  - @orion-js/http@4.2.2

## 4.0.9

### Patch Changes

- Refactor createTPaginatedQuery to return a sub-router with 3 separate procedures (getItems, getCount, getDescription) instead of a single action-based procedure

## 4.0.8

### Patch Changes

- refactor(trpc): simplify createTPaginatedQuery API with getItems

  - Replace `getCursor` with `getItems` that receives `{skip, limit, sort}` ready for MongoDB
  - Remove `PaginatedCursor` interface - no longer needed
  - Export new `PaginationParams` type
  - Better type inference from `getItems` return type

## 4.0.7

### Patch Changes

- 0289b9a: fix(trpc): add InferRouterOutputs type for correct paginated query type inference

  - Export `InferRouterOutputs<TRouter>` type that correctly infers output types for paginated queries
  - tRPC's built-in `inferRouterOutputs` returns `unknown` for complex generic types like `PaginatedResponse<TItem>`
  - The new type properly extracts output types by accessing the router's internal procedure record
  - Also exports `InferRouterInputs` for convenience alongside the new type

## 4.0.6

### Patch Changes

- Simplify PaginatedResponse to a single type with optional fields instead of a union type. This makes client-side usage simpler.

## 4.0.5

### Patch Changes

- Fix void type issue when params is undefined in createTPaginatedQuery. Now params accepts {} instead of void when no params schema is defined.

## 4.0.4

### Patch Changes

- Separate pagination fields from user params in createTPaginatedQuery. The page, limit, sortBy, and sortType fields are now top-level input fields alongside action, while params contains only user-defined parameters.

## 4.0.3

### Patch Changes

- feat(trpc): add createTPaginatedQuery for paginated table support
  fix(schema): handle schemas with field named "type" in isSchemaLike
- Updated dependencies
  - @orion-js/schema@4.2.1
  - @orion-js/http@4.2.1

## 4.0.2

### Patch Changes

- startTRPC now accepts procedures instead of a pre-built router. Component and mergeComponents are generic to preserve tRPC procedure types through the component system.

## 4.0.1

### Patch Changes

- Add @orion-js/trpc package for type-safe tRPC APIs with Orionjs integration
