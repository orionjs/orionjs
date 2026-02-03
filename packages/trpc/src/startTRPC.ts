import {createExpressMiddleware} from '@trpc/server/adapters/express'
import {AnyRouter} from '@trpc/server'
import {getApp, registerRoute, createRoute, express} from '@orion-js/http'
import {TRPCContext} from './trpc'

export interface StartTRPCOptions<T extends AnyRouter = AnyRouter> {
  router: T
  app?: express.Application
  path?: string
  bodyParserOptions?: {limit?: number | string}
}

/**
 * Start tRPC server with a pre-built router.
 *
 * @example
 * import {startTRPC, buildRouter, mergeProcedures} from '@orion-js/trpc'
 *
 * const procedures = mergeProcedures([UserProcedures, PostProcedures])
 * const appRouter = buildRouter(procedures)
 *
 * await startTRPC({router: appRouter, path: '/trpc'})
 *
 * export type AppRouter = typeof appRouter
 */
export async function startTRPC<T extends AnyRouter>(options: StartTRPCOptions<T>) {
  const {router, path = '/trpc', bodyParserOptions} = options
  const app = options.app || getApp()

  const middleware = createExpressMiddleware({
    router,
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
