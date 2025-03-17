import {createEnum} from '@orion-js/schema'
import {getModelForClass, Prop, TypedSchema} from '.'
import {describe, it, expect} from 'vitest'

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

    expect((model.getSchema() as any).color.type.__isFieldType).toBe(true)
  })
})
