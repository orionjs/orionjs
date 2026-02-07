import type {AnyProcedure, AnyRouter, inferProcedureOutput, TRPCRouterRecord} from '@trpc/server'

/**
 * Infers the output types for all procedures in a router.
 * This is an improved version of tRPC's inferRouterOutputs that correctly
 * handles complex generic types like those in createTPaginatedQuery,
 * including nested router records (sub-routers).
 *
 * @example
 * const router = buildRouter({listUsers, getUser})
 * type RouterOutputs = InferRouterOutputs<typeof router>
 * // RouterOutputs['listUsers']['getItems'] correctly infers {items: User[]}
 */
export type InferRouterOutputs<TRouter extends AnyRouter> = {
  [K in keyof TRouter['_def']['record']]: TRouter['_def']['record'][K] extends AnyProcedure
    ? inferProcedureOutput<TRouter['_def']['record'][K]>
    : TRouter['_def']['record'][K] extends TRPCRouterRecord
      ? {
          [P in keyof TRouter['_def']['record'][K]]: TRouter['_def']['record'][K][P] extends AnyProcedure
            ? inferProcedureOutput<TRouter['_def']['record'][K][P]>
            : never
        }
      : never
}

/**
 * Infers the input types for all procedures in a router.
 * Re-exported for convenience alongside InferRouterOutputs.
 */
export type {inferRouterInputs as InferRouterInputs} from '@trpc/server'
