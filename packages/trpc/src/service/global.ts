import {getInstance, Service} from '@orion-js/services'
import {TRPCProceduresMap} from '../types'

const serviceMetadata = new WeakMap<any, {_serviceType: string}>()
const proceduresMetadata = new WeakMap<any, Record<string, any>>()

export function TProcedures() {
  return (target: any, context: ClassDecoratorContext<any>) => {
    Service()(target, context)
    serviceMetadata.set(target, {_serviceType: 'trpc-procedures'})
  }
}

export function TQuery() {
  return (method: any, context: ClassFieldDecoratorContext) => {
    const propertyKey = String(context.name)

    context.addInitializer(function (this) {
      const procedures = proceduresMetadata.get(this) || {}
      procedures[propertyKey] = this[propertyKey]
      proceduresMetadata.set(this, procedures)
    })

    return method
  }
}

export function TMutation() {
  return (method: any, context: ClassFieldDecoratorContext) => {
    const propertyKey = String(context.name)

    context.addInitializer(function (this) {
      const procedures = proceduresMetadata.get(this) || {}
      procedures[propertyKey] = this[propertyKey]
      proceduresMetadata.set(this, procedures)
    })

    return method
  }
}

export function getTProcedures(target: any): TRPCProceduresMap {
  const instance = getInstance(target)

  const className = instance.constructor.name
  const errorMessage = `You must pass a class decorated with @TProcedures to getTProcedures. Check the class ${className}`

  if (!serviceMetadata.has(instance.constructor)) {
    throw new Error(errorMessage)
  }

  const instanceMetadata = serviceMetadata.get(instance.constructor)
  if (instanceMetadata._serviceType !== 'trpc-procedures') {
    throw new Error(`${errorMessage}. Got class type ${instanceMetadata._serviceType}`)
  }

  return proceduresMetadata.get(instance) || {}
}
