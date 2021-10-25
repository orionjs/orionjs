import serialize from 'serialize-javascript'
import cloneDeep from 'lodash/cloneDeep'

export default function (data: any): string {
  const cloned = cloneDeep(data)
  const serialized = serialize(cloned, {ignoreFunction: true})
  return serialized
}
