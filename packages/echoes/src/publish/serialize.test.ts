import {describe, expect, it} from 'bun:test'
import serializeJavascript from 'serialize-javascript'
import deserialize from '../echo/deserialize'
import serializeEchoesPayload from './serialize'

class PrivateModel {
  readonly #status: string

  constructor(
    public readonly _id: string,
    status: string,
  ) {
    this.#status = status
  }

  update() {}

  toJSON() {
    return {
      _id: this._id,
      status: this.#status,
      nested: {
        resolve() {},
      },
    }
  }
}

function createOrder(id = 'order-id') {
  return {
    _id: id,
    update() {},
    website() {},
    items() {},
    nested: {
      resolve() {},
    },
  }
}

function createRepresentativePayload() {
  const order = createOrder()
  const sparse: any[] = []
  sparse.length = 5
  sparse[0] = 'first'
  sparse[2] = undefined
  sparse[3] = function ignoredSparseFunction() {}
  sparse[4] = 42n

  return {
    string: 'echoes',
    number: 42,
    infinity: Infinity,
    negativeInfinity: -Infinity,
    notANumber: Number.NaN,
    boolean: true,
    nil: null,
    undefinedValue: undefined,
    bigint: 9007199254740993n,
    date: new Date('2026-08-04T12:00:00.000Z'),
    regexp: /echoes/giu,
    map: new Map<any, any>([
      ['order', order],
      [{key: 'object'}, new Set([1, undefined, createOrder('set-order')])],
    ]),
    set: new Set([order, 'value', undefined]),
    url: new URL('https://www.orionjs.com/overview/controllers/echoes?transport=kafka'),
    buffer: Buffer.from([0, 127, 255]),
    typedArray: new Uint16Array([1, 256, 65535]),
    array: [order, undefined, /nested/i],
    sparse,
    repeated: {
      first: order,
      second: order,
    },
    privateModel: new PrivateModel('private-model', 'ready'),
  }
}

describe('serializeEchoesPayload', () => {
  it('does not remove functions from a root object', () => {
    const payload = {
      rootMethod() {},
      nested: {
        nestedMethod() {},
      },
    }
    const rootMethod = payload.rootMethod
    const nestedMethod = payload.nested.nestedMethod

    const result = deserialize(serializeEchoesPayload(payload))

    expect(payload.rootMethod).toBe(rootMethod)
    expect(payload.nested.nestedMethod).toBe(nestedMethod)
    expect(result.rootMethod).toBeUndefined()
    expect(result.nested.nestedMethod).toBeUndefined()
  })

  it('does not mutate a model nested in params', () => {
    const order = createOrder()
    const originalMethods = {
      update: order.update,
      website: order.website,
      items: order.items,
      resolve: order.nested.resolve,
    }

    const serialized = serializeEchoesPayload({params: {order}})
    const result = deserialize(serialized)

    expect(order.update).toBe(originalMethods.update)
    expect(order.website).toBe(originalMethods.website)
    expect(order.items).toBe(originalMethods.items)
    expect(order.nested.resolve).toBe(originalMethods.resolve)

    expect(result.params.order.update).toBeUndefined()
    expect(result.params.order.website).toBeUndefined()
    expect(result.params.order.items).toBeUndefined()
    expect(result.params.order.nested.resolve).toBeUndefined()
  })

  it('omits methods without mutating frozen payloads', () => {
    const order = Object.freeze({
      _id: 'frozen-order',
      update() {},
      nested: Object.freeze({
        resolve() {},
      }),
    })
    const update = order.update
    const resolve = order.nested.resolve

    const result = deserialize(serializeEchoesPayload({order}))

    expect(order.update).toBe(update)
    expect(order.nested.resolve).toBe(resolve)
    expect(result.order).toEqual({_id: 'frozen-order', nested: {}})
  })

  it('does not mutate models nested in arrays, maps, or sets', () => {
    const arrayOrder = createOrder('array-order')
    const mapOrder = createOrder('map-order')
    const setOrder = createOrder('set-order')
    const methods = {
      array: arrayOrder.update,
      map: mapOrder.website,
      set: setOrder.items,
    }
    const payload = {
      array: [arrayOrder],
      map: new Map([['order', mapOrder]]),
      set: new Set([setOrder]),
    }

    const result = deserialize(serializeEchoesPayload(payload))

    expect(arrayOrder.update).toBe(methods.array)
    expect(mapOrder.website).toBe(methods.map)
    expect(setOrder.items).toBe(methods.set)
    expect(result.array[0].update).toBeUndefined()
    expect(result.map.get('order').website).toBeUndefined()
    expect([...result.set][0].items).toBeUndefined()
  })

  it('keeps the existing wire output for representative payloads', () => {
    const legacyPayload = createRepresentativePayload()
    const fixedPayload = createRepresentativePayload()

    const legacyOutput = serializeJavascript(legacyPayload, {ignoreFunction: true})
    const fixedOutput = serializeEchoesPayload(fixedPayload)

    expect(fixedOutput).toBe(legacyOutput)
  })

  it('preserves the existing supported runtime types and sparse arrays', () => {
    const payload = createRepresentativePayload()
    const sparseFunction = payload.sparse[3]
    const privateModelUpdate = payload.privateModel.update
    const result = deserialize(serializeEchoesPayload(payload))

    expect(result.date).toEqual(new Date('2026-08-04T12:00:00.000Z'))
    expect(result.regexp).toEqual(/echoes/giu)
    expect(result.map).toBeInstanceOf(Map)
    expect(result.set).toBeInstanceOf(Set)
    expect(result.url).toBeInstanceOf(URL)
    expect(result.url.toString()).toBe(
      'https://www.orionjs.com/overview/controllers/echoes?transport=kafka',
    )
    expect(Object.hasOwn(result, 'undefinedValue')).toBe(true)
    expect(result.undefinedValue).toBeUndefined()
    expect(result.bigint).toBe(9007199254740993n)
    expect(result.infinity).toBe(Infinity)
    expect(result.negativeInfinity).toBe(-Infinity)
    expect(result.notANumber).toBeNull()
    expect(result.sparse).toHaveLength(5)
    expect(payload.sparse[3]).toBe(sparseFunction)
    expect(1 in result.sparse).toBe(false)
    expect(2 in result.sparse).toBe(true)
    expect(result.sparse[2]).toBeUndefined()
    expect(3 in result.sparse).toBe(false)
    expect(result.sparse[4]).toBe(42n)

    // serialize-javascript's current Buffer and typed-array representations
    // are intentionally kept unchanged.
    expect(result.buffer).toEqual({type: 'Buffer', data: [0, 127, 255]})
    expect(result.typedArray).toEqual({0: 1, 1: 256, 2: 65535})
    expect(payload.privateModel.update).toBe(privateModelUpdate)
    expect(result.privateModel).toEqual({
      _id: 'private-model',
      status: 'ready',
      nested: {},
    })
  })

  it('preserves prototypes and repeated references while cloning', () => {
    class OrderModel {
      constructor(public readonly _id: string) {}
      update() {}
    }

    const order = new OrderModel('model-order')
    const payload = {first: order, second: order}
    const update = order.update
    const result = deserialize(serializeEchoesPayload(payload))

    expect(order).toBeInstanceOf(OrderModel)
    expect(order.update).toBe(update)
    expect(result.first).toEqual({_id: 'model-order'})
    expect(result.second).toEqual({_id: 'model-order'})
  })

  it('does not mutate cyclic input when serialization rejects the cycle', () => {
    const payload: any = {
      id: 'cyclic',
      update() {},
    }
    const update = payload.update
    payload.self = payload

    expect(() => serializeEchoesPayload(payload)).toThrow()
    expect(payload.update).toBe(update)
    expect(payload.self).toBe(payload)
  })
})
