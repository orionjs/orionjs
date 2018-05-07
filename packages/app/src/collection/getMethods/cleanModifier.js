import {cleanKey} from '@orion-js/schema'
import isEmpty from 'lodash/isEmpty'
import isNil from 'lodash/isNil'

const shouldCheck = function(key) {
  if (key === '$pushAll') throw new Error('$pushAll is not supported; use $push + $each')
  return ['$pull', '$pullAll', '$pop', '$slice'].indexOf(key) === -1
}

export default async function validateModifier(schema, modifier) {
  const cleanedModifier = {}
  for (const operation of Object.keys(modifier)) {
    const operationDoc = modifier[operation]
    cleanedModifier[operation] = {}
    // If non-operators are mixed in, throw error
    if (operation.slice(0, 1) !== '$') {
      throw new Error(`Expected '${operation}' to be a modifier operator like '$set'`)
    }
    if (!shouldCheck(operation)) continue

    if (operation === '$push' || operation === '$addToSet') {
      throw new Error('$push and $addToSet are not supported yet')
    }

    for (const key of Object.keys(operationDoc)) {
      const cleaned = await cleanKey(schema, key, operationDoc[key])
      if (!isNil(cleaned)) {
        cleanedModifier[operation][key] = cleaned
      }
    }

    if (isEmpty(cleanedModifier[operation])) {
      delete cleanedModifier[operation]
    }
  }

  return cleanedModifier
}
