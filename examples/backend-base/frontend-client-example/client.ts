import {createTRPCProxyClient, httpBatchLink, loggerLink} from '@trpc/client'
import {deserialize as superjsonDeserialize, serialize as superjsonSerialize} from 'superjson'
import type {AppRouter} from '../app'

const transformer = {
  serialize: superjsonSerialize,
  deserialize: superjsonDeserialize,
}

const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    loggerLink({
      enabled: options =>
        process.env.NODE_ENV === 'development' ||
        (options.direction === 'down' && options.result instanceof Error),
    }),
    httpBatchLink({
      url: process.env.TRPC_URL ?? 'http://localhost:3010/trpc',
      transformer,
    }),
  ],
})

async function run() {
  if (process.env.TRPC_DRY_RUN === '1') {
    process.stdout.write('tRPC client configured with SuperJSON\n')
    return
  }

  const created = await trpc.createExample.mutate({})
  process.stdout.write(`createExample: ${created.message}\n`)

  const examples = await trpc.listExamples.query({})
  process.stdout.write(`listExamples count: ${examples.length}\n`)
}

run().catch(error => {
  process.stderr.write(`tRPC client failed: ${String(error)}\n`)
  process.exitCode = 1
})
