import {generateId} from '@orion-js/helpers'
import createCollection from './index'
import {ObjectID} from 'bson'
import {TypedSchema, Prop} from '@orion-js/typed-model'

it('generates a usable mongo objectId as string', async () => {
  const Tests = createCollection({name: generateId()})

  const now = new Date()

  const userId = await Tests.insertOne({
    name: 'Nico'
  })

  const objectId = new ObjectID(userId)

  expect(objectId.toString()).toBe(userId)

  const diff = now.valueOf() - objectId.getTimestamp().valueOf()

  expect(diff).toBeGreaterThan(0)
})

it('generates a ids with a prefix', async () => {
  type DocId = `pref_${string}`

  @TypedSchema()
  class Schema {
    @Prop()
    _id: DocId

    @Prop()
    name: string
  }

  const Tests = createCollection<Schema>({
    name: generateId(),
    schema: Schema,
    idGeneration: 'random',
    idPrefix: 'pref_'
  })

  const userId = await Tests.insertOne({
    name: 'Nico'
  })

  const item = await Tests.findOne(userId)
  // no te deja usar otra cosa que no sea con el prefix
  await Tests.updateOne({_id: 'pref_123'}, {$set: {name: 'Nicolás'}})

  expect(userId).toMatch(/^pref_/)
})
