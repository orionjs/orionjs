Add this to your package.json to use the local orionjs packages:
```json
"pnpm": {
  "overrides": {
    "@orion-js/core": "link:../../packages/core",
    "@orion-js/env": "link:../../packages/env",
    "@orion-js/http": "link:../../packages/http",
    "@orion-js/logger": "link:../../packages/logger",
    "@orion-js/models": "link:../../packages/models",
    "@orion-js/mongodb": "link:../../packages/mongodb",
    "@orion-js/paginated-mongodb": "link:../../packages/paginated-mongodb",
    "@orion-js/resolvers": "link:../../packages/resolvers",
    "@orion-js/schema": "link:../../packages/schema",
    "@orion-js/services": "link:../../packages/services",
    "@orion-js/typed-model": "link:../../packages/typed-model",
    "@orion-js/migrations": "link:../../packages/migrations",
    "@orion-js/cache": "link:../../packages/cache",
    "@orion-js/components": "link:../../packages/components",
    "@orion-js/crypto": "link:../../packages/crypto",
    "@orion-js/dogs": "link:../../packages/dogs",
    "@orion-js/trpc": "link:../../packages/trpc",
    "@orion-js/echoes": "link:../../packages/echoes",
    "@orion-js/graphql": "link:../../packages/graphql"
  }
}
```
