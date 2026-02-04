# @orion-js/trpc

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
