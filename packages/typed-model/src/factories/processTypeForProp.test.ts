import {describe, it, expect} from 'vitest'
import {getParamTypeForProp} from './processTypeForProp'
import {Prop} from '../decorators/prop'
import {TypedSchema} from '../decorators/typedSchema'

describe('getParamTypeForProp', () => {
  it('should return the type unchanged for primitive types', () => {
    expect(getParamTypeForProp(String)).toBe(String)
    expect(getParamTypeForProp(Number)).toBe(Number)
    expect(getParamTypeForProp(Boolean)).toBe(Boolean)
    expect(getParamTypeForProp(Date)).toBe(Date)
    expect(getParamTypeForProp('date')).toBe('date')
    expect(getParamTypeForProp('string')).toBe('string')
    expect(getParamTypeForProp('number')).toBe('number')
    expect(getParamTypeForProp('boolean')).toBe('boolean')
  })

  it('should process array types correctly', () => {
    const result = getParamTypeForProp([String])
    expect(Array.isArray(result)).toBe(true)
    expect(result).toEqual([String])
  })

  it('should call getModel when doing typedschema', () => {
    @TypedSchema()
    class SchemaName {
      @Prop({type: 'string'})
      _id: string

      @Prop({type: 'string'})
      name: string
    }

    const result = getParamTypeForProp(SchemaName).getSchema()
    expect(result).toEqual({
      __modelName: 'SchemaName',
      _id: {type: 'string'},
      name: {type: 'string'},
    })
  })

  it('should process plain objects recursively', () => {
    const schema = {
      name: {type: 'string', optional: true},
      age: {type: 'number'},
      createdAt: {type: 'date'},
      isDeleted: {type: 'boolean'},
      metadata: {type: 'object'},
    }
    expect(getParamTypeForProp(schema)).toEqual(schema)
  })
})
