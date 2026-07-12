The example declares the released OrionJS packages at `^4.4.0`. Its `overrides` point
to the packages in this repository so changes can be tested locally without publishing.

Add the following to another app's `package.json` only when developing against a local
checkout of this monorepo:
```json
"overrides": {
  "@orion-js/core": "file:../../packages/core",
  "@orion-js/env": "file:../../packages/env",
  "@orion-js/http": "file:../../packages/http",
  "@orion-js/logger": "file:../../packages/logger",
  "@orion-js/models": "file:../../packages/models",
  "@orion-js/mongodb": "file:../../packages/mongodb",
  "@orion-js/paginated-mongodb": "file:../../packages/paginated-mongodb",
  "@orion-js/resolvers": "file:../../packages/resolvers",
  "@orion-js/schema": "file:../../packages/schema",
  "@orion-js/services": "file:../../packages/services",
  "@orion-js/typed-model": "file:../../packages/typed-model",
  "@orion-js/migrations": "file:../../packages/migrations",
  "@orion-js/components": "file:../../packages/components",
  "@orion-js/crypto": "file:../../packages/crypto",
  "@orion-js/dogs": "file:../../packages/dogs",
  "@orion-js/trpc": "file:../../packages/trpc",
  "@orion-js/echoes": "file:../../packages/echoes",
  "@orion-js/graphql": "file:../../packages/graphql"
}
```
