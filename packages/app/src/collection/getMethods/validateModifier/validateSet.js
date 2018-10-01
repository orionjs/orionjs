import fromDot from '../../../database/dot/fromDot'
import toDot from '../../../database/dot/toDot'
import {validate} from '@orion-js/schema'
import mapKeys from 'lodash/mapKeys'

/**
 * Validates $set
 */
export default async function({schema, operationDoc}) {
  let cleaned = toDot(operationDoc)
  cleaned = mapKeys(cleaned, (value, key) => key.replace('$.', '0.'))
  cleaned = fromDot(cleaned)

  await validate(schema, cleaned, {omitRequired: true})
}
