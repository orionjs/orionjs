import {initTRPC} from '@trpc/server'
import {getErrorData} from './errorHandler'

export interface TRPCContext {
  viewer?: any
}

export const t = initTRPC.context<TRPCContext>().create({
  errorFormatter({shape, error}) {
    const cause = error.cause as any
    return {
      ...shape,
      data: {
        ...shape.data,
        ...getErrorData(cause || error),
      },
    }
  },
})

export const router = t.router
export const procedure = t.procedure
