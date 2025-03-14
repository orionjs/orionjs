import {validate} from '@orion-js/schema'
import fromDot from '../../../helpers/fromDot'
import toDot from '../../../helpers/toDot'

/**
 * Validates $set
 */
export default async function ({schema, operationDoc}) {
  let cleaned = toDot(operationDoc)

  const transformedObj = {}
  Object.keys(cleaned).map(key => {
    const newKey = key.replace('$.', '0.')
    transformedObj[newKey] = cleaned[key]
  })

  cleaned = fromDot(transformedObj)

  await validate(schema, cleaned, {omitRequired: true})
}
