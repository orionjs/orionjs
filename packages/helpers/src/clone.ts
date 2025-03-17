import {isType, clone as cloneRambdax} from 'rambdax'

export function clone<T>(value: T): T {
  if (isType('Object', value)) {
    return cloneRambdax(value)
  }

  if (Array.isArray(value)) {
    return cloneRambdax(value)
  }

  return value
}
