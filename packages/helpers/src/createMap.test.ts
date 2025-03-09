import createMap from './createMap'

describe('createMap', () => {
  it('should create a map using the default _id key', () => {
    const array = [
      { _id: '1', name: 'Item 1' },
      { _id: '2', name: 'Item 2' },
      { _id: '3', name: 'Item 3' }
    ]

    const result = createMap(array)

    expect(result).toEqual({
      '1': { _id: '1', name: 'Item 1' },
      '2': { _id: '2', name: 'Item 2' },
      '3': { _id: '3', name: 'Item 3' }
    })
  })

  it('should create a map using a custom key', () => {
    const array = [
      { id: 'a', name: 'Item A' },
      { id: 'b', name: 'Item B' },
      { id: 'c', name: 'Item C' }
    ]

    const result = createMap(array, 'id')

    expect(result).toEqual({
      'a': { id: 'a', name: 'Item A' },
      'b': { id: 'b', name: 'Item B' },
      'c': { id: 'c', name: 'Item C' }
    })
  })

  it('should handle empty arrays', () => {
    const result = createMap([])
    expect(result).toEqual({})
  })

  it('should handle objects with property references', () => {
    const array = [
      { id: 'u1', message: 'Hello' },
      { id: 'u2', message: 'World' }
    ]

    const result = createMap(array, 'id')

    expect(result).toEqual({
      'u1': { id: 'u1', message: 'Hello' },
      'u2': { id: 'u2', message: 'World' }
    })
  })

  it('should overwrite items with duplicate keys', () => {
    const array = [
      { id: 'dup', value: 'First' },
      { id: 'dup', value: 'Second' },
      { id: 'dup', value: 'Third' }
    ]

    const result = createMap(array, 'id')

    // Only the last item with a given key should be preserved
    expect(result).toEqual({
      'dup': { id: 'dup', value: 'Third' }
    })
  })

  it('should handle various key types', () => {
    const array = [
      { key: 1, value: 'Number key' },
      { key: 'string', value: 'String key' },
      { key: true, value: 'Boolean key' }
    ]

    const result = createMap(array, 'key')

    expect(result).toEqual({
      '1': { key: 1, value: 'Number key' },
      'string': { key: 'string', value: 'String key' },
      'true': { key: true, value: 'Boolean key' }
    })
  })
}) 