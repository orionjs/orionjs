import clone from 'lodash/clone'

export default function (rawParams) {
  if (!rawParams) return

  // for typed model
  if (rawParams.getModel) {
    rawParams = rawParams.getModel()
  }

  if (rawParams.__isModel) {
    rawParams = rawParams.getSchema()
  }

  const params = clone(rawParams)
  Object.keys(params).forEach(key => {
    if (key.startsWith('__')) {
      delete params[key]
    }
  })

  return params
}
