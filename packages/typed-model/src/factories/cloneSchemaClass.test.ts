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
    }

    type fields = keyof SchemaName
    const _test2: fields = 'name'

    const ClonedSchema = cloneSchemaClass(SchemaName, {
      name: 'Test',
      pickFields: ['name'] as const,
    })

    console.log(ClonedSchema)

    expect(ClonedSchema).toEqual({
      __modelName: 'Test',
      name: {
        type: String,
      },
    })

    type ClonedType = typeof ClonedSchema.__tsFieldType
    type fields2 = keyof ClonedType
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _test: fields2 = 'name'
  })
})
