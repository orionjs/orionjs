import {createModel} from '@orion-js/models'
import {clean, InferSchemaType, validate} from '@orion-js/schema'
import {getModelForClass, Prop, TypedSchema} from '.'
import {describe, it, expect} from 'vitest'

describe('Test typed model with Schema', () => {
  it('Should allow passing a typed model to schema', async () => {
    @TypedSchema()
    class Point {
      @Prop({type: Number})
      latitude: number

      @Prop({type: Number})
      longitude: number
    }

    const schema = {
      points: {
        type: [Point],
      },
    }

    const result = await clean(schema, {points: [{latitude: '1', longitude: 2}]})

    expect(result).toEqual({points: [{latitude: 1, longitude: 2}]})

    await validate(schema, {points: [{latitude: 1, longitude: 2}]})
  })

  it('Should allow passing a typed model to a model using getModelForClass', async () => {
    @TypedSchema()
    class Point {
      @Prop({type: Number})
      latitude: number

      @Prop({type: Number})
      longitude: number
    }

    const Item = createModel({
      name: 'Item',
      schema: {
        points: {
          type: [getModelForClass(Point)],
        },
      },
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
    @TypedSchema()
    class Point {
      @Prop({type: Number})
      latitude: number

      @Prop({type: Number})
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

// infer type
@TypedSchema()
class Point {
  @Prop({type: Number})
  latitude: number

  @Prop({type: Number, optional: true})
  longitude?: number
}

type PointType = InferSchemaType<typeof Point>

const _point: PointType = {
  latitude: 1,
  // longitude: 2,
}
