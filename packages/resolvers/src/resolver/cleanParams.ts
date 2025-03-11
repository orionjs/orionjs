import clone from 'lodash/clone'

// @ts-ignore polyfill for Symbol.metadata // https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html#decorator-metadata
Symbol.metadata ??= Symbol('Symbol.metadata')

export default function (rawParams: any) {
  if (!rawParams) return

  // for typed model
  if (rawParams[Symbol.metadata]?._getModel) {
    rawParams = rawParams[Symbol.metadata]._getModel()
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
