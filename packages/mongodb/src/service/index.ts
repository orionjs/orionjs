import {Container, Service} from '@orion-js/services'
import createCollection from '../createCollection'
import {CreateCollectionOptions, ModelClassBase} from '../types'

export function MongoCollection<ModelClass extends ModelClassBase = ModelClassBase>(
  options: CreateCollectionOptions<ModelClass>
) {
  return function (object: any, propertyName: string, index?: number) {
    Container.registerHandler({
      object,
      propertyName,
      index,
      value: containerInstance => {
        if (!object.serviceType || object.serviceType !== 'repo') {
          throw new Error(
            'You must pass a class decorated with @Repository if you want to use @MongoCollection'
          )
        }

        return createCollection(options)
      }
    })
  }
}

export function Repository(): ClassDecorator {
  return function (target: any) {
    Service()(target)
    target.prototype.service = target
    target.prototype.serviceType = 'repo'
  }
}
