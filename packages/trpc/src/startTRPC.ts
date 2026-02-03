import {createExpressMiddleware} from '@trpc/server/adapters/express'
import {getApp, registerRoute, createRoute, express} from '@orion-js/http'
import {TRPCProceduresMap} from './types'
import {buildRouter} from './buildRouter'

export interface StartTRPCOptions<T extends TRPCProceduresMap = TRPCProceduresMap> {
  procedures: T
  app?: express.Application
  path?: string
  bodyParserOptions?: {limit?: number | string}
}

export async function startTRPC<T extends TRPCProceduresMap>(options: StartTRPCOptions<T>) {
  const {procedures, path = '/trpc', bodyParserOptions} = options
  const app = options.app || getApp()

  const appRouter = buildRouter(procedures)

  const middleware = createExpressMiddleware({
    router: appRouter,
    createContext: ({req}: any) => ({
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
