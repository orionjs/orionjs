// Core tRPC exports

// Re-export useful tRPC types (including our improved InferRouterOutputs)
export type {inferRouterInputs, inferRouterOutputs, TRPCRouterRecord} from '@trpc/server'
export {buildRouter} from './buildRouter'
export type {TMutationOptions} from './createTMutation'
export {createTMutation} from './createTMutation'
export type {PaginationParams, TPaginatedQueryOptions} from './createTPaginatedQuery'
export {createTPaginatedQuery} from './createTPaginatedQuery'
export {paginationFieldsSchema} from './createTPaginatedQuery/params'
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
export {createTRPC, procedure, router, TRPCContext, t} from './trpc'
export type {TRPCCreateOptions} from './trpc'
export type {InferRouterInputs, InferRouterOutputs} from './types'
