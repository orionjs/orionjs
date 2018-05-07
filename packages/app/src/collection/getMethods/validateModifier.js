// inspired by https://github.com/aldeed/simple-schema-js
import {validate} from '@orion-js/schema'
import fromDot from '../../database/dot/fromDot'

const shouldCheck = function(key) {
  if (key === '$pushAll') throw new Error('$pushAll is not supported, use $push + $each')
  return ['$pull', '$pullAll', '$pop', '$slice'].indexOf(key) === -1
}

export default async function validateModifier(schema, modifier, isUpsert) {
  modifier = fromDot(modifier)
  if (isUpsert) {
    throw new Error('upsert are not supported yet')
  }

  for (const operation of Object.keys(modifier)) {
    const operationDoc = modifier[operation]
    // If non-operators are mixed in, throw error
    if (operation.slice(0, 1) !== '$') {
      throw new Error(`Expected '${operation}' to be a modifier operator like '$set'`)
    }
    if (!shouldCheck(operation)) continue

    if (operation === '$push' || operation === '$addToSet') {
      throw new Error('$push and $addToSet are not supported yet')
    }

    await validate(schema, operationDoc, {omitRequired: true})
  }
}
