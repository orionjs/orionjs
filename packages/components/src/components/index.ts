export type EchoesController = {new (...args: any[]): any}
export type ResolversController = {new (...args: any[]): any}
export type SubscriptionsController = {new (...args: any[]): any}
export type JobsController = {new (...args: any[]): any}
export type RoutesController = {new (...args: any[]): any}
export type ModelResolversController = {new (...args: any[]): any}
export type TrpcController = {new (...args: any[]): any}

export interface ComponentControllers<TTrpc extends TrpcController[] = TrpcController[]> {
  echoes?: EchoesController[]
  routes?: RoutesController[]
  jobs?: JobsController[]
  resolvers?: ResolversController[]
  subscriptions?: SubscriptionsController[]
  modelResolvers?: ModelResolversController[]
  trpc?: TTrpc
}

export interface Component<TTrpc extends TrpcController[] = TrpcController[]> {
  controllers: ComponentControllers<TTrpc>
}

export function component<TTrpc extends TrpcController[] = TrpcController[]>(
  controllers: ComponentControllers<TTrpc>,
): Component<TTrpc> {
  return {controllers}
}
