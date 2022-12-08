import {createEnum} from '@orion-js/schema'
import {getModelForClass, Prop, TypedSchema} from '.'

describe('Test custom fields', () => {
  it('Should convert custom fields correctly', async () => {
    const colorsEnum = createEnum('ColorsEnum', ['red', 'blue', 'green'])
    type enumType = 'red' | 'blue' | 'green'

    @TypedSchema()
    class TestParams {
      @Prop({type: colorsEnum})
      color: enumType
    }

    const model = getModelForClass(TestParams)

    expect((model.getCleanSchema() as any).color.type._isFieldType).toBe(true)
  })
})
