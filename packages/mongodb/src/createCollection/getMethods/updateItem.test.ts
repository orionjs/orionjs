import {generateId} from '@orion-js/helpers'
import {Prop, TypedModel, TypedSchema} from '@orion-js/typed-model'
import createCollection from '..'

it('updates the item variable using updateItem', async () => {
  @TypedSchema()
  class Item {
    @Prop()
    _id: string

    @Prop()
    text: string
  }

  const Tests = createCollection<Item>({name: generateId(), model: Item})

  await Tests.insertOne({text: 'hello'})

  const item = await Tests.findOne()
  expect(item.text).toBe('hello')

  await Tests.updateItem(item, {$set: {text: 'world'}})
  expect(item.text).toBe('world')
})
