import {runWithOrionAsyncContext} from '@orion-js/logger'
import {createEchoEvent, createEchoRequest} from '../echo'
import {EchoConfig, EchoesMap} from '../types'
import {getInstance, Service} from '@orion-js/services'

export interface EchoesPropertyDescriptor extends Omit<PropertyDecorator, 'value'> {
  value?: EchoConfig<any, any>['resolve']
}
// Define metadata storage using WeakMaps
const serviceMetadata = new WeakMap<any, {_serviceType: string}>()
const echoesMetadata = new WeakMap<any, Record<string, any>>()

export function Echoes() {
  return (target: any, context: ClassDecoratorContext<any>) => {
    Service()(target, context)

    context.addInitializer(function (this) {
      serviceMetadata.set(this, {_serviceType: 'echoes'})
    })
  }
}

export function EchoEvent(): (
  method: any,
  context: ClassFieldDecoratorContext | ClassMethodDecoratorContext,
) => any
export function EchoEvent(
  options?: Omit<EchoConfig<any, any>, 'resolve' | 'type'>,
): (method: any, context: ClassMethodDecoratorContext) => any
export function EchoEvent(options = {}) {
  return (method: any, context: ClassMethodDecoratorContext | ClassFieldDecoratorContext) => {
    const propertyKey = String(context.name)

    context.addInitializer(function (this) {
      const echoes = echoesMetadata.get(this) || {}

      if (context.kind === 'method') {
        const originalResolve = this[propertyKey].bind(this)
        echoes[propertyKey] = createEchoEvent({
          ...options,
          resolve: async (params, contextData) => {
            return await runWithOrionAsyncContext(
              {
                controllerType: 'echo',
                echoName: propertyKey,
                params,
              },
              async () => {
                return await originalResolve(params, contextData)
              },
            )
          },
        })
      }

      if (context.kind === 'field') {
        echoes[propertyKey] = this[propertyKey]
      }

      echoesMetadata.set(this, echoes)
    })

    return method
  }
}

export function EchoRequest(): (
  method: any,
  context: ClassFieldDecoratorContext | ClassMethodDecoratorContext,
) => any
export function EchoRequest(
  options?: Omit<EchoConfig<any, any>, 'resolve' | 'type'>,
): (method: any, context: ClassMethodDecoratorContext) => any
export function EchoRequest(options = {}) {
  return (method: any, context: ClassMethodDecoratorContext | ClassFieldDecoratorContext) => {
    const propertyKey = String(context.name)

    context.addInitializer(function (this) {
      const echoes = echoesMetadata.get(this) || {}

      if (context.kind === 'method') {
        const originalResolve = this[propertyKey].bind(this)
        echoes[propertyKey] = createEchoRequest({
          ...options,
          resolve: async (params, contextData) => {
            return await runWithOrionAsyncContext(
              {
                controllerType: 'echo',
                echoName: propertyKey,
                params,
              },
              async () => {
                return await originalResolve(params, contextData)
              },
            )
          },
        })
      }

      if (context.kind === 'field') {
        echoes[propertyKey] = this[propertyKey]
      }

      echoesMetadata.set(this, echoes)
    })

    return method
  }
}

export function getServiceEchoes(target: any): EchoesMap {
  const instance = getInstance(target)

  if (!serviceMetadata.has(instance.constructor)) {
    throw new Error('You must pass a class decorated with @Echoes to getServiceEchoes')
  }

  const instanceMetadata = serviceMetadata.get(instance.constructor)
  if (instanceMetadata._serviceType !== 'echoes') {
    throw new Error('You must pass a class decorated with @Echoes to getServiceEchoes')
  }

  const echoesMap = echoesMetadata.get(instance) || {}

  return echoesMap
}
