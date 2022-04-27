import {Container, Service} from '@orion-js/services'
import createCollection from '../createCollection'
import {CreateCollectionOptions} from '../types'

export function MongoCollection(options: CreateCollectionOptions) {
  return function (object: any, propertyName: string, index?: number) {
    Container.registerHandler({
      object,
      propertyName,
      index,
      value: containerInstance => {
        return createCollection(options)
      }
    })
  }
}

export function Repository(): ClassDecorator {
  return function (target: any) {
    Service()(target)
    target.prototype.service = target
  }
}
