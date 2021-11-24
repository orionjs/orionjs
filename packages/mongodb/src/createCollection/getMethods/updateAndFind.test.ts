import {generateId} from '@orion-js/helpers'
import {Prop, TypedModel} from '@orion-js/typed-model'
import createCollection from '..'

it('update and finds the item and doesnt replaces the variable using updateAndFind', async () => {
  @TypedModel()
  class Item {
    @Prop()
    _id: string

    @Prop()
    text: string
  }

  const Tests = createCollection<Item>({name: generateId(), model: Item})

  await Tests.insertOne({text: 'hello'})

  const oldItem = await Tests.findOne()

  const newItem = await Tests.updateAndFind(oldItem._id, {$set: {text: 'world'}})

  expect(oldItem.text).toBe('hello')
  expect(newItem.text).toBe('world')
})
