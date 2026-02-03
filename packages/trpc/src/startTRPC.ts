import {createExpressMiddleware} from '@trpc/server/adapters/express'
import {TRPCRouterRecord, AnyRouter} from '@trpc/server'
import {getApp, registerRoute, createRoute, express} from '@orion-js/http'
import {buildRouter} from './buildRouter'
import {TRPCContext} from './trpc'

export interface StartTRPCOptions<T extends TRPCRouterRecord = TRPCRouterRecord> {
  procedures: T
  app?: express.Application
  path?: string
  bodyParserOptions?: {limit?: number | string}
}

export async function startTRPC<T extends TRPCRouterRecord>(options: StartTRPCOptions<T>) {
  const {procedures, path = '/trpc', bodyParserOptions} = options
  const app = options.app || getApp()

  const appRouter = buildRouter(procedures)

  const middleware = createExpressMiddleware({
    router: appRouter as AnyRouter,
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

  return {router: appRouter}
}
