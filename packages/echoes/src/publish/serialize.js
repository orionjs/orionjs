import serialize from 'serialize-javascript'

export default function (data) {
  const serialized = serialize(data, {ignoreFunction: true})
  return serialized
}
