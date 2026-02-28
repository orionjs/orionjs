import {getModelForClass, Prop, TypedSchema} from '..'

describe('Test prop type generator', () => {
  it('Should detect strings automatically', async () => {
    @TypedSchema()
    class Schema {
      @Prop({type: String})
      key: string
    }

    expect((getModelForClass(Schema).getSchema() as any).key.type).toBe(String)
  })
})
