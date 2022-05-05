export default function (uri: string, options: RequestInit): string {
  try {
    const body = JSON.parse(String(options.body))
    if (Array.isArray(body)) return uri
    const {operationName} = body
    return `${uri}?operationName=${operationName}`
  } catch (error) {
    return uri
  }
}
