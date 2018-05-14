import Collection from '../index'
import generateId from './generateId'
import Model from '../../Model'

it('updates a document if exists', async () => {
  const Tests = await new Collection({name: generateId()}).await()

  const docId = await Tests.insert({hello: 'world'})
  const {numberAffected, insertedId} = await Tests.upsert(
    {hello: 'world'},
    {$set: {hello: 'country'}}
  )
  expect(numberAffected).toBe(1)
  expect(insertedId).toBeNull()
  const final = await Tests.findOne(docId)
  expect(final.hello).toBe('country')
})

it('inserts a document if it does not exists', async () => {
  const Tests = await new Collection({name: generateId()}).await()

  const {numberAffected, insertedId} = await Tests.upsert(
    {hello: 'world'},
    {$set: {hello: 'country'}}
  )
  expect(numberAffected).toBe(0)
  expect(typeof insertedId).toBe('string')
  const final = await Tests.findOne()
  expect(final.hello).toBe('country')
})

it('adds autovalue when creating docs', async () => {
  const now = new Date()
  let calls = 0
  const schema = {
    _id: {
      type: 'ID'
    },
    firstName: {
      type: String,
      autoValue() {
        return 'Nicolás'
      }
    },
    lastName: {
      type: String
    },
    createdAt: {
      type: Date,
      autoValue: () => {
        calls++
        return now
      }
    }
  }
  const model = new Model({name: generateId(), schema})
  const Tests = await new Collection({name: generateId(), model}).await()

  const {numberAffected, insertedId} = await Tests.upsert(
    {firstName: 'Bastian'},
    {$set: {lastName: 'Ermann'}}
  )
  expect(numberAffected).toBe(0)
  expect(calls).toBe(1)
  expect(typeof insertedId).toBe('string')
  const final = await Tests.findOne()
  expect(final).toEqual({
    _id: insertedId,
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

  const model = new Model({name: generateId(), schema})
  const Tests = await new Collection({name: generateId(), model}).await()

  const {insertedId} = await Tests.upsert(
    {name: 'Nicolás', label: 1234},
    {
      $set: {'wife.state': 'Hungry', 'wife.name': 'Francisca'},
      $push: {friends: {name: 'Joaquín'}}
    }
  )

  await Tests.update(insertedId, {$set: {'wife.state': 'Full'}})

  const doc = await Tests.findOne(insertedId)
  expect(doc).toEqual({
    _id: insertedId,
    name: 'Nicolás',
    label: '1234',
    wife: {state: 'Full', name: 'Francisca'},
    friends: [{name: 'Joaquín'}]
  })
})
