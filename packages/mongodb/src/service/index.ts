import {addPendingFieldValidator, registerFieldFactories, Service} from '@orion-js/services'
import {createCollection} from '../createCollection'
import {CreateCollectionOptions, ModelClassBase} from '../types'

// Define metadata storage using WeakMaps
const serviceMetadata = new WeakMap<any, {_serviceType: string}>()
let pendingCollectionOptions: Record<string, CreateCollectionOptions<any>> = {}
let hasMongoCollectionFields = false

export function Repository() {
  return (target: any, context: ClassDecoratorContext<any>) => {
    // Capture and clear pending options before calling Service() so validators see they were consumed
    const options = pendingCollectionOptions
    pendingCollectionOptions = {}
    hasMongoCollectionFields = false

    Service()(target, context)
    serviceMetadata.set(target, {_serviceType: 'repo'})

    if (Object.keys(options).length > 0) {
      // Register factories that create collections lazily at getInstance() time
      const factories: Record<string, () => any> = {}
      for (const [key, opts] of Object.entries(options)) {
        factories[key] = () => createCollection(opts)
      }
      registerFieldFactories(target, factories)
    }
  }
}

export function MongoCollection<ModelClass extends ModelClassBase = ModelClassBase>(
  options: CreateCollectionOptions<ModelClass>,
) {
  return (_target: any, context: ClassFieldDecoratorContext) => {
    const propertyKey = String(context.name)
    pendingCollectionOptions[propertyKey] = options
    hasMongoCollectionFields = true

    addPendingFieldValidator(() => {
      if (hasMongoCollectionFields) {
        hasMongoCollectionFields = false
        pendingCollectionOptions = {}
        throw new Error(
          'You must pass a class decorated with @Repository if you want to use @MongoCollection',
        )
      }
    })
  }
}
