import serialize from 'serialize-javascript'

function clonePropertyDescriptor(
  descriptor: PropertyDescriptor,
  references: WeakMap<object, any>,
): PropertyDescriptor {
  // The copy only exists for serialization. Making properties configurable lets
  // ignoreFunction remove methods even when the caller passed a frozen object.
  const clonedDescriptor = {...descriptor, configurable: true}
  if ('value' in clonedDescriptor) {
    clonedDescriptor.value = cloneForSerialization(clonedDescriptor.value, references)
  }
  return clonedDescriptor
}

function copyOwnProperties(
  source: object,
  target: object,
  references: WeakMap<object, any>,
  shouldCopy: (key: PropertyKey) => boolean = () => true,
) {
  for (const key of Reflect.ownKeys(source)) {
    if (!shouldCopy(key)) continue
    const descriptor = Object.getOwnPropertyDescriptor(source, key)
    if (!descriptor) continue
    Object.defineProperty(target, key, clonePropertyDescriptor(descriptor, references))
  }
}

function cloneArrayBufferView<T extends ArrayBufferView>(
  value: T,
  references: WeakMap<object, any>,
): T {
  const sourceBuffer = value.buffer
  let clonedBuffer = references.get(sourceBuffer) as ArrayBufferLike | undefined
  const shouldCopyBufferProperties = !clonedBuffer

  if (!clonedBuffer) {
    clonedBuffer = sourceBuffer.slice(0)
    references.set(sourceBuffer, clonedBuffer)
  }

  const clone =
    value instanceof DataView
      ? new DataView(clonedBuffer, value.byteOffset, value.byteLength)
      : new (value.constructor as any)(clonedBuffer, value.byteOffset, (value as any).length)

  references.set(value, clone)
  if (shouldCopyBufferProperties) {
    copyOwnProperties(sourceBuffer, clonedBuffer, references)
  }

  // Numeric indexes already exist on typed arrays. Preserve any additional own
  // properties because serialize-javascript includes them in the wire payload.
  copyOwnProperties(value, clone, references, key => {
    if (typeof key !== 'string') return true
    const index = Number(key)
    return !(
      Number.isInteger(index) &&
      index >= 0 &&
      index < (value as any).length &&
      String(index) === key
    )
  })
  return clone as T
}

function cloneForSerialization<T>(value: T, references = new WeakMap<object, any>()): T {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return value
  if (typeof value === 'function') return value

  const source = value as object
  if (references.has(source)) return references.get(source)

  if (value instanceof Date) {
    const clone = new Date(value.getTime())
    Object.setPrototypeOf(clone, Object.getPrototypeOf(value))
    references.set(source, clone)
    return clone as T
  }

  if (value instanceof RegExp) {
    const clone = new RegExp(value.source, value.flags)
    clone.lastIndex = value.lastIndex
    Object.setPrototypeOf(clone, Object.getPrototypeOf(value))
    references.set(source, clone)
    return clone as T
  }

  if (value instanceof Map) {
    const clone = new Map()
    references.set(source, clone)
    for (const [key, entry] of value) {
      Map.prototype.set.call(
        clone,
        cloneForSerialization(key, references),
        cloneForSerialization(entry, references),
      )
    }
    Object.setPrototypeOf(clone, Object.getPrototypeOf(value))
    return clone as T
  }

  if (value instanceof Set) {
    const clone = new Set()
    references.set(source, clone)
    for (const entry of value) {
      Set.prototype.add.call(clone, cloneForSerialization(entry, references))
    }
    Object.setPrototypeOf(clone, Object.getPrototypeOf(value))
    return clone as T
  }

  if (value instanceof URL) {
    const clone = new URL(value.toString())
    Object.setPrototypeOf(clone, Object.getPrototypeOf(value))
    references.set(source, clone)
    return clone as T
  }

  if (Buffer.isBuffer(value)) {
    const clone = Buffer.from(value)
    references.set(source, clone)
    return clone as T
  }

  if (ArrayBuffer.isView(value)) {
    return cloneArrayBufferView(value, references) as T
  }

  if (
    value instanceof ArrayBuffer ||
    (typeof SharedArrayBuffer !== 'undefined' && value instanceof SharedArrayBuffer)
  ) {
    const clone = value.slice(0)
    references.set(source, clone)
    copyOwnProperties(value, clone, references)
    return clone as T
  }

  if (Array.isArray(value)) {
    const clone = new Array(value.length)
    Object.setPrototypeOf(clone, Object.getPrototypeOf(value))
    references.set(source, clone)
    copyOwnProperties(value, clone, references, key => key !== 'length')
    return clone as T
  }

  const clone = Object.create(Object.getPrototypeOf(value))
  references.set(source, clone)
  copyOwnProperties(value, clone, references)
  return clone
}

export default function (data: any): string {
  const serialized = serialize(cloneForSerialization(data), {ignoreFunction: true})
  return serialized
}
