import {TRPCRouterRecord} from '@trpc/server'
import {createTRPC, router, TRPCCreateOptions} from '../trpc'

export function buildRouter<T extends TRPCRouterRecord, TOptions extends TRPCCreateOptions = {}>(
  procedures: T,
  trpcOptions?: TOptions,
) {
  if (!trpcOptions) return router(procedures)
  return createTRPC(trpcOptions).router(procedures as any)
}
