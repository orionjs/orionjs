import {getInstance, Service} from '@orion-js/services'
import {OrionSubscription} from '../types/subscription'

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

export function Subscription(): (method: any, context: ClassFieldDecoratorContext) => any
export function Subscription() {
  return (_method: any, context: ClassFieldDecoratorContext) => {
    const propertyKey = String(context.name)
    context.addInitializer(function (this) {
      const repo = serviceMetadata.get(this.constructor)
      if (!repo || repo._serviceType !== 'subscriptions') {
        throw new Error(
          'You must pass a class decorated with @Subscriptions if you want to use @Subscription',
        )
      }

      const subscriptions = subscriptionsMetadata.get(this) || {}

      subscriptions[propertyKey] = this[propertyKey]

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
