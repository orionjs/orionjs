import {createExpressMiddleware} from '@trpc/server/adapters/express'
import {TRPCRouterRecord} from '@trpc/server'
import {getApp, registerRoute, createRoute, express} from '@orion-js/http'
import {TRPCContext} from './trpc'
import {buildRouter} from './buildRouter'

export interface StartTRPCOptions<T extends TRPCRouterRecord = TRPCRouterRecord> {
  procedures: T
  app?: express.Application
  path?: string
  bodyParserOptions?: {limit?: number | string}
}

/**
 * Start tRPC server with procedures.
 *
 * @example
 * import {startTRPC, mergeProcedures} from '@orion-js/trpc'
 *
 * const procedures = mergeProcedures([UserProcedures, PostProcedures])
 * await startTRPC({procedures, path: '/trpc'})
 *
 * // Or with component-extracted procedures:
 * const controllers = mergeComponents(components)
 * await startTRPC({procedures: controllers.trpc})
 */
export async function startTRPC<T extends TRPCRouterRecord>(options: StartTRPCOptions<T>) {
  const {procedures, path = '/trpc', bodyParserOptions} = options
  const app = options.app || getApp()
  const router = buildRouter(procedures)

  const middleware = createExpressMiddleware({
    router: router as any,
    createContext: ({req}): TRPCContext => ({
      viewer: (req as any)._viewer,
    }),
  })

  registerRoute(
    createRoute({
      app,
      method: 'all',
      path: `${path}/:trpcPath*`,
      bodyParser: 'json',
      bodyParserOptions,
      async resolve(req, res, viewer) {
        ;(req as any)._viewer = viewer
        ;(req as any).url = req.url.replace(path, '')
        return middleware(req, res, () => {})
      },
    }),
  )

  return {router}
}
