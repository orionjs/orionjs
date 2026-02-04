import type {AnyProcedure, AnyRouter, inferProcedureOutput} from '@trpc/server'

/**
 * Infers the output types for all procedures in a router.
 * This is an improved version of tRPC's inferRouterOutputs that correctly
 * handles complex generic types like those in createTPaginatedQuery.
 *
 * @example
 * const router = buildRouter({listUsers, getUser})
 * type RouterOutputs = InferRouterOutputs<typeof router>
 * // RouterOutputs['listUsers'] correctly infers PaginatedResponse<User>
 */
export type InferRouterOutputs<TRouter extends AnyRouter> = {
  [K in keyof TRouter['_def']['record']]: TRouter['_def']['record'][K] extends AnyProcedure
    ? inferProcedureOutput<TRouter['_def']['record'][K]>
    : never
}

/**
 * Infers the input types for all procedures in a router.
 * Re-exported for convenience alongside InferRouterOutputs.
 */
export type {inferRouterInputs as InferRouterInputs} from '@trpc/server'
