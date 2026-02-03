import {TRPCProceduresMap} from '../types'
import {getProcedures, router} from './getProcedures'

export function buildRouter(procedures: TRPCProceduresMap) {
  const trpcProcedures = getProcedures(procedures)
  return router(trpcProcedures)
}

export type AppRouter = ReturnType<typeof buildRouter>
