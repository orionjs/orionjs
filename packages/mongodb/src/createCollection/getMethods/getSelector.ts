import isPlainObject from 'lodash/isPlainObject'
import {Filter} from 'mongodb'
import {ModelClassBase, ModelToMongoSelector, MongoSelector} from '../../types'

export default function getSelector<ModelClass extends ModelClassBase>(
  args: IArguments
): Filter<ModelClass> {
  if (args.length === 0) return {}

  const selector = args[0] as ModelToMongoSelector<ModelClass>

  if (typeof selector === 'string') {
    return {_id: selector}
  }

  if (isPlainObject(selector)) {
    return selector as Filter<ModelClass>
  }

  return {
    _id: 'shouldReturnNull'
  } as Filter<ModelClass>
}
