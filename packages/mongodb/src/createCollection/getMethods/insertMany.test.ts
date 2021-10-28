import createInsert from './insertMany'
import {generateId} from '@orion-js/helpers'
import createCollection from '..'
import {createModel} from '@orion-js/models'

it('should return a function', async () => {
  const Tests = createCollection({name: generateId()})
  const insertMany = createInsert(Tests)
  expect(typeof insertMany).toBe('function')
})

it('insert documents without errors', async () => {
  const Tests = createCollection({name: generateId()})

  await Tests.insertMany([{hello: 'world'}, {hello: 'world'}])
  const count = await Tests.find({}).count()
  expect(count).toBe(2)
})

it('should throw an error when no document is passed', async () => {
  const Tests = createCollection({name: generateId()})

  expect.assertions(1)
  try {
    await Tests.insertMany([{a: 1}, null])
  } catch (error) {
    expect(error.message).toBe('Item at index 1 is not a document')
  }
})

it('should insert documents passing deep validation', async () => {
  const wife = {
    name: {type: String}
  }
  const schema = {
    _id: {type: 'ID'},
    wife: {type: wife}
  }
  const model = createModel({name: generateId(), schema})
  const Tests = createCollection({name: generateId(), model})

  await Tests.insertMany([{'wife.name': 'Francisca'}])
})

it('should clean a document before inserting', async () => {
  const now = new Date()
  const schema = {
    _id: {type: 'ID'},
    name: {type: String},
    createdAt: {type: Date, autoValue: () => now}
  }
  const model = createModel({name: generateId(), schema})
  const Tests = createCollection({name: generateId(), model})

  const [docId] = await Tests.insertMany([{name: 1234}])
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
    await Tests.insertMany([{}])
  } catch (error) {
    expect(error.code).toBe('validationError')
  }
})
