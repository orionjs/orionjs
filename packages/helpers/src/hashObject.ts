import crypto from 'node:crypto'

/**
 * Receives any javascript object, string, number, boolean, array, or object and returns a hash of it.
 */
export default function hashObject(object: any): string {
  const string = objectToString(object)
  return crypto.createHash('sha256').update(string).digest('hex')
}

function objectToString(object: any): string {
  if (object === null || object === undefined) {
    return 'null'
  }

  if (typeof object === 'string') {
    return object
  }

  if (typeof object === 'number' || typeof object === 'boolean') {
    return String(object)
  }

  if (object instanceof Date) {
    return object.toISOString()
  }

  if (Array.isArray(object)) {
    const arrayHash = object.map(item => hashObject(item)).join(',')
    return `[${arrayHash}]`
  }

  if (typeof object === 'object') {
    const keys = Object.keys(object).sort()
    const objectHash = keys.map(key => `${key}:${hashObject(object[key])}`).join(',')
    return `{${objectHash}}`
  }

  // Fallback for functions or other types
  return String(object)
}
