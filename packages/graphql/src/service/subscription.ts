import {Container, Service} from '@orion-js/services'
import {UserError} from '@orion-js/helpers'
import {OrionSubscription, OrionSubscriptionOptions} from '../types/subscription'
import {subscription} from '..'

export function Subscriptions(): ClassDecorator {
  return function (target: any) {
    Service()(target)
    target.prototype.service = target
    target.prototype.serviceType = 'subscriptions'
  }
}

export function Subscription<T = any, ReturnType = any>(options: OrionSubscriptionOptions) {
  return function (object: any, propertyName: string, index?: number) {
    const sub: OrionSubscription<T, ReturnType> = subscription({
      name: propertyName,
      ...options
    })

    object.subscriptions = object.subscriptions || {}
    object.subscriptions[propertyName] = sub

    Container.registerHandler({
      object,
      propertyName,
      index,
      value: containerInstance => {
        if (!object.serviceType || object.serviceType !== 'subscriptions') {
          throw new Error(
            'You must pass a class decorated with @Subscriptions if you want to use @Subscription'
          )
        }

        return sub
      }
    })
  }
}

export function getServiceSubscriptions(target: any): {
  [key: string]: OrionSubscription
} {
  if (!target.prototype) {
    throw new UserError('You must pass a class to getSubscriptions')
  }

  return target.prototype.subscriptions || {}
}
