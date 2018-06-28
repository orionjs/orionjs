import {cleanKey, clean} from '@orion-js/schema'
import isEmpty from 'lodash/isEmpty'
import isNil from 'lodash/isNil'
import isUndefined from 'lodash/isUndefined'
import isEqual from 'lodash/isEqual'
import fromDot from '../../database/dot/fromDot'

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

    for (const key of Object.keys(operationDoc)) {
      const value = operationDoc[key]
      let cleaned = null
      if (operation === '$push' || operation === '$addToSet') {
        if (typeof value === 'object' && '$each' in value) {
          const $each = await cleanKey(schema, key, value.$each)
          cleaned = {...value, $each}
        } else {
          cleaned = await cleanKey(schema, `${key}.0`, value)
        }
      }

      if (operation === '$set') {
        cleaned = await cleanKey(schema, key, value)
      }

      if (operation === '$setOnInsert') {
        cleaned = await cleanKey(schema, key, value)
      }

      if (operation === '$inc') {
        cleaned = await cleanKey(schema, key, value)
      }

      if (operation === '$unset') {
        const isPresent = await cleanKey(schema, key, 'anyvalue')
        cleaned = !isNil(isPresent) ? '' : null
      }

      if (!isUndefined(cleaned)) {
        cleanedModifier[operation][key] = cleaned
      }
    }

    if (isEmpty(cleanedModifier[operation])) {
      delete cleanedModifier[operation]
    }
  }

  if (cleanedModifier.$setOnInsert) {
    cleanedModifier.$setOnInsert = await clean(schema, fromDot(cleanedModifier.$setOnInsert))
  }

  if (isEqual(cleanedModifier, {})) {
    throw new Error('After cleaning your modifier is empty')
  }

  return cleanedModifier
}
