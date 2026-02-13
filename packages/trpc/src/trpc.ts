import {initTRPC} from '@trpc/server'
import {defaultErrorFormatter} from './errorHandler'

export interface TRPCContext {
  viewer?: any
}

export const t = initTRPC.context<TRPCContext>().create({
  errorFormatter: defaultErrorFormatter,
})

export const procedure = t.procedure
