import isPlainObject from 'lodash/isPlainObject'

export default function(args) {
  if (args.length === 0) return {}

  let selector = args[0]
  if (typeof selector === 'string') {
    return {_id: selector}
  }

  if (isPlainObject(selector)) {
    return selector
  }

  return {
    _id: 'shouldReturnNull'
  }
}
