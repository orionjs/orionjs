import {schemaWithName} from '@orion-js/schema'
import {generateId} from '@orion-js/helpers'
import {expect, it} from 'vitest'
import {typedId} from '../types'
import {createCollection} from '.'

it('Should correclty infer the document type from a passed schema', async () => {
  const ItemSchema = schemaWithName('ItemSchema', {
    _id: {type: typedId('item')},
    name: {type: 'string'},
  })

  const collection = createCollection({
    name: generateId(),
    schema: ItemSchema,
  })

  await collection.findOne({_id: 'item-32'})
  // await collection.findOne({_id: 'noitem-32'}) // should fail

  expect(ItemSchema._id.type.name).toBe('typedId:item')
})

it('Should generate collection items with the correct id prefix from the schema', async () => {
  const ItemSchema = schemaWithName('ItemSchema', {
    _id: {type: typedId('item')},
    name: {type: 'string'},
  })

  const collection = createCollection({
    name: generateId(),
    schema: ItemSchema,
  })

  const itemId = await collection.insertOne({name: 'test'})
  const first5Chars = itemId.toString().slice(0, 5)
  expect(first5Chars).toBe('item-')
})
