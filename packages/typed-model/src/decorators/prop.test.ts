import {getModelForClass, Prop, TypedSchema} from '..'
import {describe, it, expect} from 'vitest'

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
