import {
  initTRPC,
  TRPCRouterRecord,
  TRPCQueryProcedure,
  TRPCMutationProcedure,
} from '@trpc/server'
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

/**
 * Extract the input type from a procedure's resolve function
 */
export type ExtractInput<T> = T extends {resolve: (params: infer P, viewer: any) => any} ? P : void

/**
 * Extract the output type from a procedure's resolve function
 */
export type ExtractOutput<T> = T extends {resolve: (params: any, viewer: any) => Promise<infer R>} ? R : void

/**
 * Maps a procedures map to tRPC procedures record type
 */
export type MapProceduresToTRPC<T extends TRPCProceduresMap> = {
  [K in keyof T]: T[K] extends {mutation: false}
    ? TRPCQueryProcedure<{
        input: ExtractInput<T[K]>
        output: ExtractOutput<T[K]>
        meta: unknown
      }>
    : T[K] extends {mutation: true}
      ? TRPCMutationProcedure<{
          input: ExtractInput<T[K]>
          output: ExtractOutput<T[K]>
          meta: unknown
        }>
      : never
}

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

export function getProcedures<T extends TRPCProceduresMap>(procedures: T): TRPCRouterRecord {
  const trpcProcedures: TRPCRouterRecord = {}

  for (const [name, procedure] of Object.entries(procedures)) {
    trpcProcedures[name] = createProcedure(procedure)
  }

  return trpcProcedures
}
