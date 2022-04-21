import {getInstance, Service} from '@orion-js/services'
import {Echo as EchoType, echo, EchoConfig} from '@orion-js/echoes'

export function Echoes(): ClassDecorator {
  return function (target: any) {
    Service()(target)
    target.prototype.service = target
  }
}

export interface EchoesPropertyDescriptor extends Omit<PropertyDecorator, 'value'> {
  value?: EchoConfig['resolve']
}

export function EchoRequest(options: Omit<EchoConfig, 'resolve' | 'type'> = {}) {
  return function (target: any, propertyKey: string, descriptor: EchoesPropertyDescriptor) {
    if (!descriptor.value) throw new Error(`You must pass resolver function to ${propertyKey}`)

    target.echoes = target.echoes || {}
    target.echoes[propertyKey] = echo({
      ...options,
      type: 'request',
      resolve: async (params, viewer) => {
        const instance: any = getInstance(target.service)
        return await instance[propertyKey](params, viewer)
      }
    })
  }
}

export function EchoEvent(options: Omit<EchoConfig, 'resolve' | 'type'> = {}) {
  return function (target: any, propertyKey: string, descriptor: EchoesPropertyDescriptor) {
    if (!descriptor.value) throw new Error(`You must pass resolver function to ${propertyKey}`)

    target.echoes = target.echoes || {}
    target.echoes[propertyKey] = echo({
      ...options,
      type: 'event',
      resolve: async (params, viewer) => {
        const instance: any = getInstance(target.service)
        return await instance[propertyKey](params, viewer)
      }
    })
  }
}

export function getServiceEchoes(target: any): {[key: string]: EchoType} {
  if (!target.prototype) {
    throw new Error('You must pass a class to getServiceRoutes')
  }

  return target.prototype.echoes || {}
}
