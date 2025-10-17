import util from 'node:util'
import {isEmpty} from 'rambdax'

export function getMetadataText(metadata: any): string {
  const {value, ...rest} = metadata
  if (isEmpty(rest)) {
    if (typeof value === 'undefined') return ''
    return util.inspect(value, {colors: true})
  }
  return `${util.inspect(value, {colors: true})} ${util.inspect(rest, {colors: true})}`
}
