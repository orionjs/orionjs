import createMapArray from './createMapArray'
import {describe, it, expect} from 'vitest'

describe('createMapArray', () => {
  it('should create a map of arrays using the default _id key', () => {
    const array = [
      {_id: '1', name: 'Item 1'},
      {_id: '2', name: 'Item 2'},
      {_id: '1', name: 'Item 1 Duplicate'},
    ]

    const result = createMapArray(array)

    expect(result).toEqual({
      '1': [
        {_id: '1', name: 'Item 1'},
        {_id: '1', name: 'Item 1 Duplicate'},
      ],
      '2': [{_id: '2', name: 'Item 2'}],
    })
  })

  it('should create a map of arrays using a custom key', () => {
    const array = [
      {category: 'A', name: 'Item A1'},
      {category: 'B', name: 'Item B1'},
      {category: 'A', name: 'Item A2'},
      {category: 'C', name: 'Item C1'},
      {category: 'B', name: 'Item B2'},
    ]

    const result = createMapArray(array, 'category')

    expect(result).toEqual({
      A: [
        {category: 'A', name: 'Item A1'},
        {category: 'A', name: 'Item A2'},
      ],
      B: [
        {category: 'B', name: 'Item B1'},
        {category: 'B', name: 'Item B2'},
      ],
      C: [{category: 'C', name: 'Item C1'}],
    })
  })

  it('should handle empty arrays', () => {
    const result = createMapArray([])
    expect(result).toEqual({})
  })

  it('should preserve the original order of items within each group', () => {
    const array = [
      {type: 'fruit', name: 'apple', order: 1},
      {type: 'vegetable', name: 'carrot', order: 1},
      {type: 'fruit', name: 'banana', order: 2},
      {type: 'fruit', name: 'cherry', order: 3},
      {type: 'vegetable', name: 'broccoli', order: 2},
    ]

    const result = createMapArray(array, 'type')

    // Items should be grouped by type and maintain their original order
    expect(result.fruit.map(item => item.order)).toEqual([1, 2, 3])
    expect(result.vegetable.map(item => item.order)).toEqual([1, 2])
  })

  it('should handle various key types', () => {
    const array = [
      {key: 1, value: 'Number key 1'},
      {key: 1, value: 'Number key 2'},
      {key: 'string', value: 'String key 1'},
      {key: 'string', value: 'String key 2'},
      {key: true, value: 'Boolean key'},
    ]

    const result = createMapArray(array, 'key')

    expect(result).toEqual({
      '1': [
        {key: 1, value: 'Number key 1'},
        {key: 1, value: 'Number key 2'},
      ],
      string: [
        {key: 'string', value: 'String key 1'},
        {key: 'string', value: 'String key 2'},
      ],
      true: [{key: true, value: 'Boolean key'}],
    })
  })

  it('should handle items with missing keys by using undefined', () => {
    const array = [{id: '1', name: 'Has ID'}, {name: 'No ID'}, {id: '2', name: 'Has ID 2'}]

    const result = createMapArray(array, 'id')

    expect(result).toEqual({
      '1': [{id: '1', name: 'Has ID'}],
      '2': [{id: '2', name: 'Has ID 2'}],
      undefined: [{name: 'No ID'}],
    })
  })
})
