import {v7 as uuidv7} from 'uuid'

export function generateUUID() {
  return uuidv7()
}

export function generateUUIDWithPrefix(prefix: string) {
  return `${prefix}-${generateUUID()}`
}
