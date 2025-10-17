import {AsyncLocalStorage} from 'node:async_hooks'
import {randomUUID} from 'node:crypto'

interface BaseOrionAsyncContext {
  contextId: string
  viewer?: unknown
  params?: unknown
}

export interface JobAsyncContext extends BaseOrionAsyncContext {
  controllerType: 'job'
  jobName: string
}

export interface RouteAsyncContext extends BaseOrionAsyncContext {
  controllerType: 'route'
  routeName: string
  pathname: string
}

export interface ResolverAsyncContext extends BaseOrionAsyncContext {
  controllerType: 'resolver'
  resolverName?: string
}

export interface ModelResolverAsyncContext extends BaseOrionAsyncContext {
  controllerType: 'modelResolver'
  modelName?: string
  modelResolverName?: string
  parentData?: unknown
}

export interface SubscriptionAsyncContext extends BaseOrionAsyncContext {
  controllerType: 'subscription'
  subscriptionName: string
}

export interface EchoAsyncContext extends BaseOrionAsyncContext {
  controllerType: 'echo'
  echoName: string
}

export type OrionAsyncContext =
  | JobAsyncContext
  | RouteAsyncContext
  | ResolverAsyncContext
  | ModelResolverAsyncContext
  | SubscriptionAsyncContext
  | EchoAsyncContext

const storage: AsyncLocalStorage<OrionAsyncContext> = new AsyncLocalStorage()

export async function runWithOrionAsyncContext<TReturn>(
  context: Omit<JobAsyncContext, 'contextId'>,
  callback: () => Promise<TReturn> | TReturn,
): Promise<TReturn>
export async function runWithOrionAsyncContext<TReturn>(
  context: Omit<RouteAsyncContext, 'contextId'>,
  callback: () => Promise<TReturn> | TReturn,
): Promise<TReturn>
export async function runWithOrionAsyncContext<TReturn>(
  context: Omit<ResolverAsyncContext, 'contextId'>,
  callback: () => Promise<TReturn> | TReturn,
): Promise<TReturn>
export async function runWithOrionAsyncContext<TReturn>(
  context: Omit<ModelResolverAsyncContext, 'contextId'>,
  callback: () => Promise<TReturn> | TReturn,
): Promise<TReturn>
export async function runWithOrionAsyncContext<TReturn>(
  context: Omit<SubscriptionAsyncContext, 'contextId'>,
  callback: () => Promise<TReturn> | TReturn,
): Promise<TReturn>
export async function runWithOrionAsyncContext<TReturn>(
  context: Omit<EchoAsyncContext, 'contextId'>,
  callback: () => Promise<TReturn> | TReturn,
): Promise<TReturn>
export async function runWithOrionAsyncContext<TReturn>(
  context: Omit<OrionAsyncContext, 'contextId'>,
  callback: () => Promise<TReturn> | TReturn,
): Promise<TReturn> {
  const contextWithId = {
    contextId: randomUUID(),
    ...context,
  } as OrionAsyncContext
  return await storage.run(contextWithId, async () => {
    return await callback()
  })
}

export const getOrionAsyncContext = (): OrionAsyncContext | undefined => {
  return storage.getStore()
}

export const updateOrionAsyncContext = (
  context: Partial<OrionAsyncContext>,
): OrionAsyncContext | undefined => {
  const currentContext: OrionAsyncContext | undefined = storage.getStore()
  if (!currentContext) {
    return undefined
  }

  Object.assign(currentContext, context)
  return currentContext
}
