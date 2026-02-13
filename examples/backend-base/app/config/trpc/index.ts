import {startTRPC} from '@orion-js/trpc'
import {logger} from '@orion-js/logger'
import type {TRPCRouterRecord} from '@trpc/server'
import superjson from 'superjson'

export default async function startTrpc<T extends TRPCRouterRecord>(procedures: T) {
  const {router} = await startTRPC({
    procedures,
    path: '/trpc',
    trpcOptions: {
      transformer: superjson,
    },
  })

  logger.info('tRPC started at /trpc')

  return {router}
}
