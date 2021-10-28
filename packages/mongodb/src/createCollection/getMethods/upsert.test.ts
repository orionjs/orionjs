import {generateId} from '@orion-js/helpers'
import {createModel} from '@orion-js/models'
import createCollection from '..'

it('updates a document if exists', async () => {
  const Tests = createCollection({name: generateId()})

  const docId = await Tests.insertOne({hello: 'world'})
  const {modifiedCount, upsertedId} = await Tests.upsert(
    {hello: 'world'},
    {$set: {hello: 'country'}}
  )
  expect(modifiedCount).toBe(1)
  expect(upsertedId).toBeNull()
  const final = await Tests.findOne(docId)
  expect(final.hello).toBe('country')
})

it('inserts a document if it does not exists', async () => {
  const Tests = createCollection({name: generateId()})

  const {modifiedCount, upsertedId} = await Tests.upsert(
    {hello: 'world'},
    {$set: {hello: 'country'}}
  )
  expect(modifiedCount).toBe(0)
  expect(typeof upsertedId).toBe('string')
  const final = await Tests.findOne({})
  expect(final.hello).toBe('country')
})

it('adds default value when creating docs', async () => {
  const now = new Date()
  let calls = 0
  const schema = {
    _id: {
      type: 'ID'
    },
    firstName: {
      type: String,
      defaultValue: () => 'Nicolás'
    },
    lastName: {
      type: String
    },
    createdAt: {
      type: Date,
      defaultValue: () => {
        calls++
        return now
      }
    }
  }
  const model = createModel({name: generateId(), schema})
  const Tests = createCollection({
    name: generateId(),
    model
  })

  const {modifiedCount, upsertedId} = await Tests.upsert(
    {firstName: 'Bastian'},
    {$set: {lastName: 'Ermann'}}
  )
  expect(modifiedCount).toBe(0)
  expect(calls).toBe(1)
  expect(typeof upsertedId).toBe('string')
  const final = await Tests.findOne({})
  expect(final).toEqual({
    _id: upsertedId,
    firstName: 'Nicolás',
    lastName: 'Ermann',
    createdAt: now
  })
})

it('should upsert documents passing cleaning validation', async () => {
  const person = {
    name: {type: String},
    state: {type: String, optional: true}
  }

  const schema = {
    _id: {type: 'ID'},
    name: {type: String},
    label: {type: String},
    wife: {type: person},
    friends: {type: [person]}
  }

  const model = createModel({name: generateId(), schema})
  const Tests = createCollection({
    name: generateId(),
    model
  })

  const {upsertedId} = await Tests.upsert(
    {name: 'Nicolás', label: 1234},
    {
      $set: {'wife.state': 'Hungry', 'wife.name': 'Francisca'},
      $push: {friends: {name: 'Joaquín'}}
    }
  )

  await Tests.updateOne(upsertedId, {$set: {'wife.state': 'Full'}})

  const doc = await Tests.findOne(upsertedId)
  expect(doc).toEqual({
    _id: upsertedId,
    name: 'Nicolás',
    label: '1234',
    wife: {state: 'Full', name: 'Francisca'},
    friends: [{name: 'Joaquín'}]
  })
})
