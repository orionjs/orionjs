import isPlainObject from 'lodash/isPlainObject'
import {Document, Filter} from 'mongodb'
import {MongoSelector} from '../../types'

export default function (args: IArguments): Filter<Document> {
  if (args.length === 0) return {}

  const selector = args[0] as MongoSelector

  if (typeof selector === 'string') {
    return {_id: selector}
  }

  if (isPlainObject(selector)) {
    return selector
  }

  return {
    _id: 'shouldReturnNull'
  }
}
