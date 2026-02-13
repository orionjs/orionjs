import {initTRPC} from '@trpc/server'
import {getErrorData} from './errorHandler'

export interface TRPCContext {
  viewer?: any
}

const trpcBuilder = initTRPC.context<TRPCContext>()

export type TRPCCreateOptions = Parameters<typeof trpcBuilder.create>[0]

const defaultErrorFormatter = ({shape, error}: any) => {
  const cause = error.cause as any
  return {
    ...shape,
    data: {
      ...shape.data,
      ...getErrorData(cause || error),
    },
  }
}

export function createTRPC<TOptions extends TRPCCreateOptions>(
  options: TOptions,
): ReturnType<typeof trpcBuilder.create<TOptions>>
export function createTRPC(): ReturnType<typeof trpcBuilder.create<{}>>
export function createTRPC(options?: TRPCCreateOptions) {
  return trpcBuilder.create({
    ...options,
    errorFormatter: options?.errorFormatter || defaultErrorFormatter,
  })
}

export const t = createTRPC()

export const router = t.router
export const procedure = t.procedure
