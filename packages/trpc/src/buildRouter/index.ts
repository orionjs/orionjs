import {TRPCRouterRecord} from '@trpc/server'
import {router} from '../trpc'

export function buildRouter<T extends TRPCRouterRecord>(procedures: T) {
  return router(procedures)
}
