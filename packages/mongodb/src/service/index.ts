import {Service} from '@orion-js/services'
import {createCollection} from '../createCollection'
import {CreateCollectionOptions, ModelClassBase} from '../types'

// Define metadata storage using WeakMaps
const serviceMetadata = new WeakMap<any, {_serviceType: string}>()

export function Repository() {
  return (target: any, context: ClassDecoratorContext<any>) => {
    Service()(target, context)

    context.addInitializer(function (this) {
      serviceMetadata.set(this, {_serviceType: 'repo'})
    })
  }
}

export function MongoCollection<ModelClass extends ModelClassBase = ModelClassBase>(
  options: CreateCollectionOptions<ModelClass>,
) {
  return (_target: any, context: ClassFieldDecoratorContext) => {
    const propertyKey = String(context.name)
    context.addInitializer(function (this) {
      const repo = serviceMetadata.get(this.constructor)
      if (!repo || repo._serviceType !== 'repo') {
        throw new Error(
          'You must pass a class decorated with @Repository if you want to use @MongoCollection',
        )
      }

      const collection = createCollection(options)
      this[propertyKey] = collection
    })
  }
}
