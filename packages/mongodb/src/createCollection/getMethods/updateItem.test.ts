import {generateId} from '@orion-js/helpers'
import {Prop, TypedSchema} from '@orion-js/typed-model'
import {createCollection} from '..'
import {it, expect} from 'vitest'

it('updates the item variable using updateItem', async () => {
  @TypedSchema()
  class Item {
    @Prop({type: String})
    _id: string

    @Prop({type: String})
    text: string
  }

  const Tests = createCollection<Item>({name: generateId(), schema: Item})

  await Tests.insertOne({text: 'hello'})

  const item = await Tests.findOne()
  expect(item.text).toBe('hello')

  await Tests.updateItem(item, {$set: {text: 'world'}})
  expect(item.text).toBe('world')
})
