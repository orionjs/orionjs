import isArray from 'lodash/isArray'
import {getStaticFields} from './getStaticFields'

export default async function getBasicQuery(field) {
  if (!field.type) return ''

  if ((isArray(field.type) && field.type[0].__model) || field.type.__model) {
    const model = isArray(field.type) ? field.type[0].__model : field.type.__model
    const fields = []
    for (const field of getStaticFields(model)) {
      fields.push(await getBasicQuery(field))
    }
    const key = field.key ? `${field.key} ` : ''
    return `${key}{ ${fields.join(' ')} }`
  } else {
    return field.key
  }
}
