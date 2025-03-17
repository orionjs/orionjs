import {cleanKey, clean} from '@orion-js/schema'
import {isEmpty, isNil, equals} from 'rambdax'
import * as MongoDB from 'mongodb'
import fromDot from '../../helpers/fromDot'
import {ModelClassBase} from '../../types'

const shouldCheck = key => {
  if (key === '$pushAll') throw new Error('$pushAll is not supported; use $push + $each')
  return ['$pull', '$pullAll', '$pop', '$slice'].indexOf(key) === -1
}

export default async function cleanModifier<
  ModelClass extends ModelClassBase,
  TFilter extends MongoDB.UpdateFilter<ModelClass>,
>(schema, modifier: TFilter, {isUpsert} = {isUpsert: false}) {
  const cleanedModifier: MongoDB.UpdateFilter<MongoDB.Document> = {}
  for (const operation of Object.keys(modifier)) {
    const operationDoc = modifier[operation]
    cleanedModifier[operation] = {}
    // If non-operators are mixed in, throw error
    if (operation.slice(0, 1) !== '$') {
      throw new Error(`Expected '${operation}' to be a modifier operator like '$set'`)
    }
    if (!shouldCheck(operation)) {
      cleanedModifier[operation] = operationDoc
      continue
    }

    for (const key of Object.keys(operationDoc)) {
      const value = operationDoc[key]
      const cleanOptions = {forceDoc: operationDoc}

      let cleaned = null
      if (operation === '$push' || operation === '$addToSet') {
        if (typeof value === 'object' && '$each' in value) {
          const $each = await cleanKey(schema, key, value.$each, cleanOptions)
          cleaned = {...value, $each}
        } else {
          cleaned = await cleanKey(schema, `${key}.0`, value, cleanOptions)
        }
      }

      if (operation === '$set') {
        cleaned = await cleanKey(schema, key, value, cleanOptions)
      }

      if (operation === '$setOnInsert') {
        cleaned = await cleanKey(schema, key, value, cleanOptions)
      }

      if (operation === '$inc') {
        cleaned = await cleanKey(schema, key, value, cleanOptions)
      }

      if (operation === '$unset') {
        const isPresent = await cleanKey(schema, key, 'anyvalue', cleanOptions)
        cleaned = !isNil(isPresent) ? '' : null
      }

      if (cleaned !== undefined) {
        cleanedModifier[operation][key] = cleaned
      }
    }

    if (isEmpty(cleanedModifier[operation])) {
      delete cleanedModifier[operation]
    }
  }

  if (isUpsert) {
    const cleanedSetOnInsert = await clean(schema, fromDot(cleanedModifier.$setOnInsert || {}))

    if (!isEmpty(cleanedSetOnInsert)) {
      cleanedModifier.$setOnInsert = cleanedSetOnInsert
    }
  }

  if (equals(cleanedModifier, {})) {
    throw new Error('After cleaning your modifier is empty')
  }

  return cleanedModifier as TFilter
}
