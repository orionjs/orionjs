import {generateId} from '@orion-js/helpers'
import {Prop, TypedSchema} from '@orion-js/typed-model'
import {createCollection} from '..'
import {it, expect} from 'vitest'

it('update and finds the item and doesnt replaces the variable using updateAndFind', async () => {
  @TypedSchema()
  class Item {
    @Prop({type: String})
    _id: string

    @Prop({type: String})
    text: string
  }

  const Tests = createCollection<Item>({name: generateId(), schema: Item})

  await Tests.insertOne({text: 'hello'})

  const oldItem = await Tests.findOne()

  const newItem = await Tests.updateAndFind(oldItem._id, {$set: {text: 'world'}})

  expect(oldItem.text).toBe('hello')
  expect(newItem.text).toBe('world')
})
