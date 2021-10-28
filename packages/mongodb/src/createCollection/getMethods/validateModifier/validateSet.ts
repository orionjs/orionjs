import {validate} from '@orion-js/schema'
import mapKeys from 'lodash/mapKeys'
import fromDot from '../../../helpers/fromDot'
import toDot from '../../../helpers/toDot'

/**
 * Validates $set
 */
export default async function ({schema, operationDoc}) {
  let cleaned = toDot(operationDoc)
  cleaned = mapKeys(cleaned, (value, key) => key.replace('$.', '0.'))
  cleaned = fromDot(cleaned)

  await validate(schema, cleaned, {omitRequired: true})
}
