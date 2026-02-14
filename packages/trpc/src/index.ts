// Re-export useful tRPC types
export type {inferRouterInputs, inferRouterOutputs, TRPCRouterRecord} from '@trpc/server'
export type {TMutationOptions} from './createTMutation'
export {createTMutation} from './createTMutation'
export type {PaginationParams, TPaginatedQueryOptions} from './createTPaginatedQuery'
export {createTPaginatedQuery} from './createTPaginatedQuery'
export {paginationFieldsSchema} from './createTPaginatedQuery/params'
// Procedure creators
export type {TQueryOptions} from './createTQuery'
export {createTQuery} from './createTQuery'
// Error handling (use defaultErrorFormatter with your own initTRPC instance)
export {defaultErrorFormatter, getErrorData, mapErrorToTRPCError} from './errorHandler'
export type {RegisterTRPCRouteOptions} from './registerTRPCRoute'
export {registerTRPCRoute} from './registerTRPCRoute'
// Service decorators
export type {ExtractProcedures} from './service'
export {
  getTProcedures,
  mergeProcedures,
  Procedures,
  TMutation,
  TPaginatedQuery,
  TProcedures,
  TQuery,
} from './service'

// Internal tRPC instance and context type
export {procedure, TRPCContext, t} from './trpc'
export type {InferRouterInputs, InferRouterOutputs} from './types'
