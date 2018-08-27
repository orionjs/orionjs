import createInsert from './insertMany'
import Collection from '../index'
import generateId from '../../helpers/generateId'
import Model from '../../Model'

it('should return a function', async () => {
  const insertMany = createInsert({})
  expect(typeof insertMany).toBe('function')
})

it('insert documents without errors', async () => {
  const Tests = await new Collection({name: generateId()}).await()

  await Tests.insertMany([{hello: 'world'}, {hello: 'world'}])
  const count = await Tests.find().count()
  expect(count).toBe(2)
})

it('should throw an error when no document is passed', async () => {
  const Tests = await new Collection({name: generateId()}).await()

  expect.assertions(1)
  try {
    await Tests.insertMany([{a: 1}, null])
  } catch (error) {
    expect(error.message).toBe('Insert must receive a document')
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
  const model = new Model({name: generateId(), schema})
  const Tests = await new Collection({name: generateId(), model}).await()

  await Tests.insertMany([{'wife.name': 'Francisca'}])
})

it('should clean a document before inserting', async () => {
  const now = new Date()
  const schema = {
    _id: {type: 'ID'},
    name: {type: String},
    createdAt: {type: Date, autoValue: () => now}
  }
  const model = new Model({name: generateId(), schema})
  const Tests = await new Collection({name: generateId(), model}).await()

  const [docId] = await Tests.insertMany([{name: 1234}])
  const result = await Tests.findOne(docId)
  expect(result.name).toBe('1234')
  expect(result.createdAt).toEqual(now)
})

it('should validate a document', async () => {
  const schema = {_id: {type: 'ID'}, name: {type: String}}
  const model = new Model({name: generateId(), schema})
  const Tests = await new Collection({name: generateId(), model}).await()

  expect.assertions(1)
  try {
    await Tests.insertMany([{}])
  } catch (error) {
    expect(error.code).toBe('validationError')
  }
})
