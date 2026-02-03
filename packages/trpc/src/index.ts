// Core tRPC exports
export {t, router, procedure, TRPCContext} from './trpc'

// Procedure creators
export {createTQuery} from './createTQuery'
export type {TQueryOptions} from './createTQuery'
export {createTMutation} from './createTMutation'
export type {TMutationOptions} from './createTMutation'

// Service decorators
export {
  Procedures,
  TProcedures,
  TQuery as TQueryDecorator,
  TMutation as TMutationDecorator,
  getTProcedures,
} from './service'
export type {ExtractProcedures} from './service'

// Router building
export {startTRPC} from './startTRPC'
export type {StartTRPCOptions} from './startTRPC'
export {buildRouter} from './buildRouter'

// Re-export useful tRPC types
export type {inferRouterInputs, inferRouterOutputs, TRPCRouterRecord} from '@trpc/server'
