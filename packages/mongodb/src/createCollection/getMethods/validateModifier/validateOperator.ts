import validatePush from './validatePush'
import validateUnset from './validateUnset'
import validateInc from './validateInc'
import validateSet from './validateSet'

const shouldCheck = function (key: string): boolean {
  if (key === '$pushAll') throw new Error('$pushAll is not supported, use $push + $each')
  return ['$pull', '$pullAll', '$pop', '$slice'].indexOf(key) === -1
}

export default async function ({schema, operationDoc, operation}) {
  if (!shouldCheck(operation)) return

  if (operation === '$set') {
    await validateSet({schema, operationDoc})
  } else if (operation === '$unset') {
    await validateUnset({schema, operationDoc})
  } else if (operation === '$inc') {
    await validateInc({schema, operationDoc})
  } else if (operation === '$push' || operation === '$addToSet') {
    await validatePush({schema, operationDoc, operation})
  } else {
    throw new Error(operation + ' operation is not supported yet')
  }
}
