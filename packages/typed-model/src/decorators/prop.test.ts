import {getModelForClass, Prop, TypedSchema} from '..'

describe('Test prop type generator', () => {
  it('Should detect strings automatically', async () => {
    @TypedSchema()
    class Schema {
      @Prop()
      key: string
    }

    expect((getModelForClass(Schema).getCleanSchema() as any).key.type).toBe(String)
  })
})
