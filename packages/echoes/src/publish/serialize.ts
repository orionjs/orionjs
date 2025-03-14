import serialize from 'serialize-javascript'
import {clone} from '@orion-js/helpers'

export default function (data: any): string {
  const cloned = clone(data)
  const serialized = serialize(cloned, {ignoreFunction: true})
  return serialized
}
