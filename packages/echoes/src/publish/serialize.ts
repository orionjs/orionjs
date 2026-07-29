import serialize from 'serialize-javascript'

export default function (data: any): string {
  const serialized = serialize(data, {ignoreFunction: true})
  return serialized
}
