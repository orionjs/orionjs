import {Prop, TypedSchema} from '..'
import {cloneSchemaClass} from './cloneSchemaClass'
import {describe, expect, it} from 'vitest'

describe('cloneSchemaClass', () => {
  it('should clone a schema class', async () => {
    @TypedSchema()
    class SchemaName {
      @Prop({type: String})
      _id: string

      @Prop({type: String})
      name: string

      @Prop({type: String})
      name2: string
    }

    type fields = keyof SchemaName
    const _test2: fields = 'name'

    const ClonedSchema = cloneSchemaClass(SchemaName, {
      name: 'Test',
      pickFields: ['name', 'name2'],
    })

    expect(ClonedSchema).toEqual({
      __modelName: 'Test',
      name: {
        type: String,
      },
      name2: {
        type: String,
      },
    })

    type ClonedType = typeof ClonedSchema.__tsFieldType
    type fields2 = keyof ClonedType
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _test: fields2 = 'name'
  })

  it('should clone a schema class without passing pick fields', () => {
    @TypedSchema()
    class SchemaName12341 {
      @Prop({type: String})
      _id: string

      @Prop({type: String})
      name: string
    }

    const ClonedSchema = cloneSchemaClass(SchemaName12341, {
      name: 'Test',
    })

    expect(ClonedSchema).toEqual({
      __modelName: 'Test',
      _id: {
        type: String,
      },
      name: {
        type: String,
      },
    })
  })
})
