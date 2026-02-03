import {initTRPC} from '@trpc/server'
import {TRPCProcedure, TRPCProceduresMap} from '../types'
import {getErrorData, mapErrorToTRPCError} from '../errorHandler'

export interface TRPCContext {
  viewer?: any
}

const t = initTRPC.context<TRPCContext>().create({
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
export const publicProcedure = t.procedure

function createProcedure(procedure: TRPCProcedure) {
  const handler = async ({ctx}: {ctx: TRPCContext; input?: any}) => {
    try {
      return await procedure.execute({params: {}, viewer: ctx.viewer})
    } catch (error) {
      throw mapErrorToTRPCError(error as Error)
    }
  }

  const handlerWithInput = async ({ctx, input}: {ctx: TRPCContext; input: any}) => {
    try {
      return await procedure.execute({params: input || {}, viewer: ctx.viewer})
    } catch (error) {
      throw mapErrorToTRPCError(error as Error)
    }
  }

  if (procedure.mutation) {
    return procedure.params
      ? publicProcedure.input((val: any) => val).mutation(handlerWithInput)
      : publicProcedure.mutation(handler)
  }

  return procedure.params
    ? publicProcedure.input((val: any) => val).query(handlerWithInput)
    : publicProcedure.query(handler)
}

export function getProcedures(procedures: TRPCProceduresMap) {
  const trpcProcedures: Record<string, any> = {}

  for (const [name, procedure] of Object.entries(procedures)) {
    if (procedure.private) {
      continue
    }

    trpcProcedures[name] = createProcedure(procedure)
  }

  return trpcProcedures
}
