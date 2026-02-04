// Core tRPC exports

// Re-export useful tRPC types
export type {inferRouterInputs, inferRouterOutputs, TRPCRouterRecord} from '@trpc/server'
export {buildRouter} from './buildRouter'
export type {TMutationOptions} from './createTMutation'
export {createTMutation} from './createTMutation'
export type {
  PaginatedAction,
  PaginatedCountResponse,
  PaginatedCursor,
  PaginatedDescription,
  PaginatedItemsResponse,
  PaginatedQueryInput,
  PaginatedResponse,
  TPaginatedQueryOptions,
} from './createTPaginatedQuery'
export {createTPaginatedQuery} from './createTPaginatedQuery'
export {paginatedBaseParamsSchema} from './createTPaginatedQuery/params'
export type {TQueryOptions} from './createTQuery'
// Procedure creators
export {createTQuery} from './createTQuery'
export type {ExtractProcedures} from './service'
// Service decorators
export {
  getTProcedures,
  mergeProcedures,
  Procedures,
  TMutation,
  TPaginatedQuery,
  TProcedures,
  TQuery,
} from './service'
export type {StartTRPCOptions} from './startTRPC'
// Router building
export {startTRPC} from './startTRPC'
export {procedure, router, TRPCContext, t} from './trpc'
