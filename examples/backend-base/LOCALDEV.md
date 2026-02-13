Add this to your package.json to use the local orionjs packages:
```json
"pnpm": {
  "overrides": {
    "@orion-js/core": "link:../orionjs/packages/core",
    "@orion-js/env": "link:../orionjs/packages/env",
    "@orion-js/http": "link:../orionjs/packages/http",
    "@orion-js/logger": "link:../orionjs/packages/logger",
    "@orion-js/models": "link:../orionjs/packages/models",
    "@orion-js/mongodb": "link:../orionjs/packages/mongodb",
    "@orion-js/paginated-mongodb": "link:../orionjs/packages/paginated-mongodb",
    "@orion-js/resolvers": "link:../orionjs/packages/resolvers",
    "@orion-js/schema": "link:../orionjs/packages/schema",
    "@orion-js/services": "link:../orionjs/packages/services",
    "@orion-js/typed-model": "link:../orionjs/packages/typed-model",
    "@orion-js/migrations": "link:../orionjs/packages/migrations",
    "@orion-js/cache": "link:../orionjs/packages/cache",
    "@orion-js/components": "link:../orionjs/packages/components",
    "@orion-js/crypto": "link:../orionjs/packages/crypto",
    "@orion-js/dogs": "link:../orionjs/packages/dogs",
    "@orion-js/echoes": "link:../orionjs/packages/echoes",
    "@orion-js/graphql": "link:../orionjs/packages/graphql"
  }
}
```