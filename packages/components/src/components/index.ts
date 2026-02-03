export type EchoesController = {new (...args: any[]): any}
export type ResolversController = {new (...args: any[]): any}
export type SubscriptionsController = {new (...args: any[]): any}
export type JobsController = {new (...args: any[]): any}
export type RoutesController = {new (...args: any[]): any}
export type ModelResolversController = {new (...args: any[]): any}
export type TrpcController = {new (...args: any[]): any}

export interface ComponentControllers {
  echoes?: EchoesController[]
  routes?: RoutesController[]
  jobs?: JobsController[]
  resolvers?: ResolversController[]
  subscriptions?: SubscriptionsController[]
  modelResolvers?: ModelResolversController[]
  trpc?: TrpcController[]
}

export interface Component {
  controllers: ComponentControllers
}

export function component(controllers: ComponentControllers): Component {
  return {controllers}
}
