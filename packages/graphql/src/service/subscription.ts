import {getInstance, Service} from '@orion-js/services'
import {OrionSubscription, OrionSubscriptionOptions} from '../types/subscription'
import {subscription} from '..'

// Define metadata storage using WeakMaps
const serviceMetadata = new WeakMap<any, {_serviceType: string}>()
const subscriptionsMetadata = new WeakMap<any, Record<string, any>>()

export function Subscriptions() {
  return (target: any, context: ClassDecoratorContext<any>) => {
    Service()(target, context)

    context.addInitializer(function (this) {
      serviceMetadata.set(this, {_serviceType: 'subscriptions'})
    })
  }
}

export function Subscription<TParams, TReturns>(
  options: Omit<OrionSubscriptionOptions, 'params' | 'returns'> & {
    params: TParams
    returns: TReturns
  },
) {
  return (_target: any, context: ClassFieldDecoratorContext) => {
    const propertyKey = String(context.name)
    context.addInitializer(function (this) {
      const repo = serviceMetadata.get(this.constructor)
      if (!repo || repo._serviceType !== 'subscriptions') {
        throw new Error(
          'You must pass a class decorated with @Subscriptions if you want to use @Subscription',
        )
      }

      const subscriptions = subscriptionsMetadata.get(this) || {}

      subscriptions[propertyKey] = subscription({
        name: propertyKey,
        ...options,
      })

      subscriptionsMetadata.set(this, subscriptions)

      this[propertyKey] = subscriptions[propertyKey]
    })
  }
}

export function getServiceSubscriptions(target: any): {
  [key: string]: OrionSubscription
} {
  const instance = getInstance(target)

  if (!serviceMetadata.has(instance.constructor)) {
    throw new Error(
      'You must pass a class decorated with @Subscriptions to getServiceSubscriptions',
    )
  }

  const instanceMetadata = serviceMetadata.get(instance.constructor)
  if (instanceMetadata._serviceType !== 'subscriptions') {
    throw new Error(
      'You must pass a class decorated with @Subscriptions to getServiceSubscriptions',
    )
  }

  const subscriptionsMap = subscriptionsMetadata.get(instance) || {}

  return subscriptionsMap
}
