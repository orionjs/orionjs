import validatePush from './validatePush'
import validateUnset from './validateUnset'
import validateInc from './validateInc'
import fromDot from '../../../database/dot/fromDot'
import {validate} from '@orion-js/schema'

const shouldCheck = function(key) {
  if (key === '$pushAll') throw new Error('$pushAll is not supported, use $push + $each')
  return ['$pull', '$pullAll', '$pop', '$slice'].indexOf(key) === -1
}

export default async function({schema, operationDoc, operation}) {
  if (!shouldCheck(operation)) return

  if (operation === '$set') {
    await validate(schema, fromDot(operationDoc), {omitRequired: true})
  } else if (operation === '$unset') {
    await validateUnset({schema, operationDoc, operation})
  } else if (operation === '$inc') {
    await validateInc({schema, operationDoc, operation})
  } else if (operation === '$push' || operation === '$addToSet') {
    await validatePush({schema, operationDoc, operation})
  } else {
    throw new Error(operation + ' operation is not supported yet')
  }
}
