import isPlainObject from 'lodash/isPlainObject'
import isEmpty from 'lodash/isEmpty'
import {Document, Filter} from 'mongodb'
import {OrionCollection} from '../Types'

export default function (selector?: OrionCollection.MongoSelector): Filter<Document> {
  if (isEmpty(selector)) return {}

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
