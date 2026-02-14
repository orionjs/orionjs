# Frontend tRPC + SuperJSON Example

This example uses the `AppRouter` type from `../app/index.ts` and configures the client transformer with `superjson`.

## Run

1. Start backend-base on port `3010`.
2. Install deps for this example:

```bash
pnpm install
```

3. Run the client:

```bash
pnpm dev
```

To validate config without hitting the backend:

```bash
TRPC_DRY_RUN=1 pnpm dev
```

## Key part

```ts
const transformer = {
  serialize: superjson.serialize,
  deserialize: superjson.deserialize,
}

httpBatchLink({
  url: 'http://localhost:3010/trpc',
  transformer,
})
```

The transformer must match the backend `initTRPC.create({transformer})` config.
