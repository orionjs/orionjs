import isArray from 'lodash/isArray'

export default async function getBasicQuery(field) {
  if ((isArray(field.type) && field.type[0].__model) || field.type.__model) {
    const model = isArray(field.type) ? field.type[0].__model : field.type.__model
    const fields = []
    for (const field of model.staticFields) {
      fields.push(await getBasicQuery(field))
    }
    const key = field.key ? `${field.key} ` : ''
    return `${key}{ ${fields.join(' ')} }`
  } else {
    return field.key
  }
}
