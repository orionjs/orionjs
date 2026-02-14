import {defaultErrorFormatter, type TRPCContext} from '@orion-js/trpc'
import {initTRPC} from '@trpc/server'
import {deserialize as superjsonDeserialize, serialize as superjsonSerialize} from 'superjson'

const transformer = {
  serialize: superjsonSerialize,
  deserialize: superjsonDeserialize,
}

export const t = initTRPC.context<TRPCContext>().create<{
  transformer: typeof transformer
  errorFormatter: typeof defaultErrorFormatter
}>({
  transformer,
  errorFormatter: defaultErrorFormatter,
})
