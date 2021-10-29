export default function (param: any): any {
  if (typeof param !== 'function') return param

  const result = param() || {}
  if (result.default) return result.default

  return result || {}
}
