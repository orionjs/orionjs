import createInsert from './insertOne'
import {generateId} from '@orion-js/helpers'
import createCollection from '..'
import {createModel} from '@orion-js/resolvers'

it('should return a function', async () => {
  const Tests = createCollection({name: generateId()})
  const insertOne = createInsert(Tests)
  expect(typeof insertOne).toBe('function')
})

it('insertOnes a document without errors', async () => {
  const Tests = createCollection({name: generateId()})

  await Tests.insertOne({hello: 'world'})
  const count = await Tests.find({}).count()
  expect(count).toBe(1)
})

it('should insertOne documents passing deep validation', async () => {
  const wife = {
    name: {type: String}
  }
  const schema = {
    _id: {type: 'ID'},
    wife: {type: wife}
  }
  const model = createModel({name: generateId(), schema})
  const Tests = createCollection({name: generateId(), model})

  await Tests.insertOne({'wife.name': 'Francisca'})
})

it('should clean a document before insertOneing', async () => {
  const now = new Date()
  const schema = {
    _id: {type: 'ID'},
    name: {type: String},
    createdAt: {type: Date, autoValue: () => now}
  }
  const model = createModel({name: generateId(), schema})
  const Tests = createCollection({name: generateId(), model})

  const docId = await Tests.insertOne({name: 1234})
  const result = await Tests.findOne(docId)
  expect(result.name).toBe('1234')
  expect(result.createdAt).toEqual(now)
})

it('should validate a document', async () => {
  const schema = {_id: {type: 'ID'}, name: {type: String}}
  const model = createModel({name: generateId(), schema})
  const Tests = createCollection({name: generateId(), model})

  expect.assertions(1)
  try {
    await Tests.insertOne({})
  } catch (error) {
    expect(error.code).toBe('validationError')
  }
})
