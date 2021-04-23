import isArray from 'lodash/isArray'
export default function (uri, options) {
  try {
    const body = JSON.parse(options.body)
    if (isArray(body)) return uri
    const {operationName} = body
    return `${uri}?operationName=${operationName}`
  } catch (error) {
    return uri
  }
}
