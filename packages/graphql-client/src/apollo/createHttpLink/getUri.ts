import isArray from 'lodash/isArray'

export interface GetUriOptions {
  body: string
}
export default function (uri: string, options: GetUriOptions): string {
  try {
    const body = JSON.parse(options.body)
    if (isArray(body)) return uri
    const {operationName} = body
    return `${uri}?operationName=${operationName}`
  } catch (error) {
    return uri
  }
}
