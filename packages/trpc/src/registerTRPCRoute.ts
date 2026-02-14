import {createRoute, getApp, registerRoute} from '@orion-js/http'
import type {AnyRouter, inferRouterContext} from '@trpc/server'
import {
  type CreateExpressContextOptions,
  createExpressMiddleware,
} from '@trpc/server/adapters/express'

function normalizePath(path: string): string {
  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`

  if (withLeadingSlash.length === 1) return withLeadingSlash

  return withLeadingSlash.replace(/\/+$/, '')
}

function stripMountPath(url: string, mountPath: string): string {
  if (mountPath === '/') return url
  if (url === mountPath) return '/'
  if (url.startsWith(`${mountPath}/`)) return url.slice(mountPath.length)
  return url
}

export interface RegisterTRPCRouteOptions<TRouter extends AnyRouter> {
  appRouter: TRouter
  path?: string
  createContext?: (
    options: CreateExpressContextOptions & {viewer: any},
  ) => inferRouterContext<TRouter> | Promise<inferRouterContext<TRouter>>
}

export function registerTRPCRoute<TRouter extends AnyRouter>({
  appRouter,
  path = '/trpc',
  createContext,
}: RegisterTRPCRouteOptions<TRouter>) {
  const resolvedPath = normalizePath(path)

  const middleware = createExpressMiddleware<TRouter>({
    router: appRouter,
    createContext: async options => {
      const viewer = (options.req as any)._viewer
      if (createContext) return await createContext({...options, viewer})
      return {viewer} as inferRouterContext<TRouter>
    },
  })

  registerRoute(
    createRoute({
      app: getApp(),
      method: 'all',
      path: `${resolvedPath}/:trpcPath*`,
      bodyParser: 'json',
      async resolve(req, res, viewer) {
        ;(req as any)._viewer = viewer
        ;(req as any).url = stripMountPath(req.url, resolvedPath)
        middleware(req as any, res as any, () => {})
      },
    }),
  )
}
