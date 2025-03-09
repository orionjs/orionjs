import { v4 as uuidv4 } from 'uuid'

export function generateUUID() {
  return uuidv4()
}

export function generateUUIDWithPrefix(prefix: string) {
  return `${prefix}-${generateUUID()}`
}
