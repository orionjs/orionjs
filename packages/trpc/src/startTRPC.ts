import {createRoute, express, getApp, registerRoute} from '@orion-js/http'
import {TRPCRouterRecord} from '@trpc/server'
import {createExpressMiddleware} from '@trpc/server/adapters/express'
import {buildRouter} from './buildRouter'
import {TRPCContext, TRPCCreateOptions} from './trpc'

type TrpcExpressMiddlewareOptions = Parameters<typeof createExpressMiddleware>[0]
type StartTRPCCreateContext = TrpcExpressMiddlewareOptions['createContext']
type StartTRPCMiddlewareOptions = Omit<TrpcExpressMiddlewareOptions, 'router' | 'createContext'>

export interface StartTRPCOptions<
  T extends TRPCRouterRecord = TRPCRouterRecord,
  TOptions extends TRPCCreateOptions = {},
> extends StartTRPCMiddlewareOptions {
  procedures: T
  app?: express.Application
  path?: string
  bodyParserOptions?: {limit?: number | string}
  createContext?: StartTRPCCreateContext
  trpcOptions?: TOptions
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
export async function startTRPC<
  T extends TRPCRouterRecord,
  TOptions extends TRPCCreateOptions = {},
>(options: StartTRPCOptions<T, TOptions>) {
  const {
    procedures,
    path = '/trpc',
    bodyParserOptions,
    trpcOptions,
    createContext,
    ...middlewareOptions
  } = options
  const app = options.app || getApp()
  const router = buildRouter(procedures, trpcOptions)

  const middleware = createExpressMiddleware({
    ...middlewareOptions,
    router: router as any,
    createContext: async (ctxOptions): Promise<any> => {
      const defaultContext: TRPCContext = {viewer: (ctxOptions.req as any)._viewer}
      if (!createContext) return defaultContext

      const customContext = await createContext(ctxOptions as any)
      if (!customContext || typeof customContext !== 'object') return customContext

      return {
        ...defaultContext,
        ...customContext,
      }
    },
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
