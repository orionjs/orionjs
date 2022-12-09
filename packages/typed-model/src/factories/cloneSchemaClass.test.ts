import {Prop, TypedSchema} from '..'
import {cloneSchemaClass} from './cloneSchemaClass'

describe('cloneSchemaClass', () => {
  it('should clone a schema class', async () => {
    @TypedSchema()
    class SchemaName {
      @Prop()
      _id: string

      @Prop()
      name: string
    }

    type fields = keyof SchemaName
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const test2: fields = 'name'

    const ClonedSchema = cloneSchemaClass(SchemaName, {
      name: 'Test',
      pickFields: ['name']
    })

    type fields2 = keyof typeof ClonedSchema
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const test: fields2 = 'name'
  })
})
