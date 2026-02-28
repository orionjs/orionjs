import {getInstance, Service} from '@orion-js/services'
import {OrionSubscription} from '../types/subscription'

// Define metadata storage using WeakMaps
const serviceMetadata = new WeakMap<any, {_serviceType: string}>()
const subscriptionsMetadata = new WeakMap<any, Record<string, any>>()
const subscriptionEntriesByClass = new Map<Function, Record<string, (instance: any) => any>>()
let pendingSubscriptionEntries: Record<string, (instance: any) => any> = {}

export function Subscriptions() {
  return (target: any, context: ClassDecoratorContext<any>) => {
    Service()(target, context)
    serviceMetadata.set(target, {_serviceType: 'subscriptions'})

    if (Object.keys(pendingSubscriptionEntries).length > 0) {
      subscriptionEntriesByClass.set(target, pendingSubscriptionEntries)
      pendingSubscriptionEntries = {}
    }
  }
}

export function Subscription(): (method: any, context: ClassFieldDecoratorContext) => any
export function Subscription() {
  return (_method: any, context: ClassFieldDecoratorContext) => {
    const propertyKey = String(context.name)
    pendingSubscriptionEntries[propertyKey] = (instance: any) => instance[propertyKey]
  }
}

function initializeSubscriptionsIfNeeded(instance: any) {
  if (subscriptionsMetadata.has(instance)) return
  const entries = subscriptionEntriesByClass.get(instance.constructor) || {}
  const subscriptions: Record<string, any> = {}
  for (const [key, setup] of Object.entries(entries)) {
    subscriptions[key] = setup(instance)
  }
  subscriptionsMetadata.set(instance, subscriptions)
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

  initializeSubscriptionsIfNeeded(instance)

  const subscriptionsMap = subscriptionsMetadata.get(instance) || {}

  return subscriptionsMap
}
