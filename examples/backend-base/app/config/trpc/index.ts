import {startTRPC} from '@orion-js/trpc'
import {logger} from '@orion-js/logger'
import type {TRPCRouterRecord} from '@trpc/server'

export default async function startTrpc<T extends TRPCRouterRecord>(procedures: T) {
  const {router} = await startTRPC({procedures, path: '/trpc'})

  logger.info('tRPC started at /trpc')

  return {router}
}
