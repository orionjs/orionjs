import {createRoute, getApp, registerRoute} from '@orion-js/http'
import {logger} from '@orion-js/logger'
import {defaultErrorFormatter} from '@orion-js/trpc'
import type {TRPCRouterRecord} from '@trpc/server'
import {initTRPC} from '@trpc/server'
import {createExpressMiddleware} from '@trpc/server/adapters/express'
import superjson from 'superjson'

const t = initTRPC.create({
  transformer: superjson,
  errorFormatter: defaultErrorFormatter,
})

export default function startTrpc<T extends TRPCRouterRecord>(procedures: T) {
  const appRouter = t.router(procedures)

  const middleware = createExpressMiddleware({
    router: appRouter,
    createContext: ({req}) => ({
      viewer: (req as any)._viewer,
    }),
  })

  const app = getApp()
  const path = '/trpc'

  registerRoute(
    createRoute({
      app,
      method: 'all',
      path: `${path}/:trpcPath*`,
      bodyParser: 'json',
      async resolve(req, res, viewer) {
        ;(req as any)._viewer = viewer
        ;(req as any).url = req.url.replace(path, '')
        return middleware(req, res, () => {})
      },
    }),
  )

  logger.info('tRPC started at /trpc')

  return {router: appRouter}
}
