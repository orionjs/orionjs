import isPlainObject from 'lodash/isPlainObject'
import {Document, Filter} from 'mongodb'
import {OrionCollection} from '../Types'
import isUndefined from 'lodash/isUndefined'

export default function (selector: OrionCollection.MongoSelector): Filter<Document> {
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
