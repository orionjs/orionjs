import isNil from 'lodash/isNil'

export default async function({options, value, info}) {
  if (!options.optional) {
    if (isNil(value)) {
      return 'Value is required'
    }
  }

  if (typeof options.custom === 'function') {
    const message = await options.custom(value, info)
    if (message) return message
  }
}
