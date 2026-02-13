import {TRPCRouterRecord} from '@trpc/server'
import {createTRPC, router, TRPCCreateOptions} from '../trpc'

export function buildRouter<T extends TRPCRouterRecord>(
  procedures: T,
  trpcOptions?: TRPCCreateOptions,
) {
  const defaultRouter = router(procedures)
  if (!trpcOptions) return defaultRouter
  return createTRPC(trpcOptions).router(procedures as any) as typeof defaultRouter
}
