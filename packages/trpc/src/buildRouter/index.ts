import {TRPCProceduresMap} from '../types'
import {getProcedures, router, MapProceduresToTRPC} from './getProcedures'

export function buildRouter<T extends TRPCProceduresMap>(procedures: T) {
  const trpcProcedures = getProcedures(procedures)
  return router(trpcProcedures)
}

export type BuildRouter<T extends TRPCProceduresMap> = ReturnType<typeof router<MapProceduresToTRPC<T>>>

export type {MapProceduresToTRPC, ExtractInput, ExtractOutput} from './getProcedures'
