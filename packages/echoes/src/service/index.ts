import {createEchoEvent, createEchoRequest} from '../echo'
import {getEchoesRuntime, runWithEchoesContext} from '../runtime'
import {EchoConfig, type EchoEventConfig, EchoesMap} from '../types'

export interface EchoesPropertyDescriptor extends Omit<PropertyDecorator, 'value'> {
  value?: EchoConfig<any, any>['resolve']
}
// Define metadata storage using WeakMaps
const serviceMetadata = new WeakMap<any, {_serviceType: string}>()
const echoesMetadata = new WeakMap<any, Record<string, any>>()
const echoEntriesByClass = new Map<Function, Record<string, (instance: any) => any>>()
const standaloneInstances = new WeakMap<Function, any>()
let pendingEchoEntries: Record<string, (instance: any) => any> = {}

export function Echoes() {
  return (target: any, context: ClassDecoratorContext<any>) => {
    getEchoesRuntime().decorateService?.(target, context)
    serviceMetadata.set(target, {_serviceType: 'echoes'})

    if (Object.keys(pendingEchoEntries).length > 0) {
      echoEntriesByClass.set(target, pendingEchoEntries)
      pendingEchoEntries = {}
    }
  }
}

export function EchoEvent(): (
  method: any,
  context: ClassFieldDecoratorContext | ClassMethodDecoratorContext,
) => any
export function EchoEvent(
  options?: Omit<EchoEventConfig<any, any>, 'resolve'>,
): (method: any, context: ClassMethodDecoratorContext) => any
export function EchoEvent(options = {}) {
  return (method: any, context: ClassMethodDecoratorContext | ClassFieldDecoratorContext) => {
    const propertyKey = String(context.name)

    if (context.kind === 'method') {
      pendingEchoEntries[propertyKey] = (instance: any) => {
        const originalResolve = instance[propertyKey].bind(instance)
        return createEchoEvent({
          ...options,
          resolve: async (params, contextData) => {
            return await runWithEchoesContext(
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
    }

    if (context.kind === 'field') {
      pendingEchoEntries[propertyKey] = (instance: any) => instance[propertyKey]
    }

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

    if (context.kind === 'method') {
      pendingEchoEntries[propertyKey] = (instance: any) => {
        const originalResolve = instance[propertyKey].bind(instance)
        return createEchoRequest({
          ...options,
          resolve: async (params, contextData) => {
            return await runWithEchoesContext(
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
    }

    if (context.kind === 'field') {
      pendingEchoEntries[propertyKey] = (instance: any) => instance[propertyKey]
    }

    return method
  }
}

function initializeEchoesIfNeeded(instance: any) {
  if (echoesMetadata.has(instance)) return
  const entries = echoEntriesByClass.get(instance.constructor) || {}
  const echoes: Record<string, any> = {}
  for (const [key, setup] of Object.entries(entries)) {
    echoes[key] = setup(instance)
  }
  echoesMetadata.set(instance, echoes)
}

export function getServiceEchoes(target: any): EchoesMap {
  let instance: any
  if (typeof target !== 'function') {
    instance = target
  } else if (getEchoesRuntime().getInstance) {
    instance = getEchoesRuntime().getInstance(target)
  } else {
    instance = standaloneInstances.get(target)
    if (!instance) {
      instance = new target()
      standaloneInstances.set(target, instance)
    }
  }

  if (!serviceMetadata.has(instance.constructor)) {
    throw new Error('You must pass a class decorated with @Echoes to getServiceEchoes')
  }

  const instanceMetadata = serviceMetadata.get(instance.constructor)
  if (instanceMetadata._serviceType !== 'echoes') {
    throw new Error('You must pass a class decorated with @Echoes to getServiceEchoes')
  }

  initializeEchoesIfNeeded(instance)

  const echoesMap = echoesMetadata.get(instance) || {}

  return echoesMap
}
