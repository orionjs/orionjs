import createInsert from './insertOne'
import {generateId} from '@orion-js/helpers'
import {createCollection} from '..'
import {TypedSchema, Prop} from '@orion-js/typed-model'
import {expect, it, describe} from 'vitest'

describe('insertAndFind', () => {
  it('should return a function', async () => {
    const Tests = createCollection({name: generateId()})
    const insertOne = createInsert(Tests)
    expect(typeof insertOne).toBe('function')
  })

  it('inserts and finds a cleaned document', async () => {
    @TypedSchema()
    class TestSchema1 {
      @Prop({type: String})
      _id: string

      @Prop({
        type: String,
        clean: string => `cleaned ${string}`,
      })
      hello: string
    }

    const Tests = createCollection<TestSchema1>({name: generateId(), schema: TestSchema1})

    const result = await Tests.insertAndFind({hello: 'world'})
    const count = await Tests.estimatedDocumentCount()
    expect(count).toBe(1)

    expect(result).toEqual({
      _id: result._id,
      hello: 'cleaned world',
    })
  })
})
