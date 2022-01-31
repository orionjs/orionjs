import {createModel} from '@orion-js/models'
import {clean, Schema, validate} from '@orion-js/schema'
import {Prop, TypedModel} from '.'

describe('Test typed model with Schema', () => {
  it('Should allow passing a typed model to schema', async () => {
    @TypedModel()
    class Point {
      @Prop()
      latitude: number

      @Prop()
      longitude: number
    }

    const schema = {
      points: {
        type: [Point]
      }
    }

    const result = await clean(schema, {points: [{latitude: '1', longitude: 2}]})

    expect(result).toEqual({points: [{latitude: 1, longitude: 2}]})

    await validate(schema, {points: [{latitude: 1, longitude: 2}]})
  })

  it('Should allow passing a typed model to a model', async () => {
    @TypedModel()
    class Point {
      @Prop()
      latitude: number

      @Prop()
      longitude: number
    }

    const Item = createModel({
      name: 'Item',
      schema: {
        points: {
          type: [Point]
        }
      }
    })

    const result = await Item.clean({points: [{latitude: '1', longitude: 2}]})

    expect.assertions(2)

    expect(result).toEqual({points: [{latitude: 1, longitude: 2}]})

    try {
      await Item.validate({points: [{latitude: '1', longitude: 2}]})
    } catch (error) {
      expect(error.message).toBe('Validation Error: {points.0.latitude: notANumber}')
    }
  })

  it('Should allow cleaning and validating just the typed model', async () => {
    @TypedModel()
    class Point {
      @Prop()
      latitude: number

      @Prop()
      longitude: number
    }

    const result = await clean(Point, {latitude: '1', longitude: 2})

    expect(result).toEqual({latitude: 1, longitude: 2})

    try {
      await validate(Point, {latitude: '1', longitude: 2})
    } catch (error) {
      expect(error.message).toBe('Validation Error: {latitude: notANumber}')
    }
  })
})
