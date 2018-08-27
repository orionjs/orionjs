import createInsert from './insertOne'
import Collection from '../index'
import generateId from '../../helpers/generateId'
import Model from '../../Model'

it('should return a function', async () => {
  const insertOne = createInsert({})
  expect(typeof insertOne).toBe('function')
})

it('insertOnes a document without errors', async () => {
  const Tests = await new Collection({name: generateId()}).await()

  await Tests.insertOne({hello: 'world'})
  const count = await Tests.find().count()
  expect(count).toBe(1)
})

it('should throw an error when no document is passed', async () => {
  const Tests = await new Collection({name: generateId()}).await()

  expect.assertions(1)
  try {
    await Tests.insertOne()
  } catch (error) {
    expect(error.message).toBe('Insert must receive a document')
  }
})

it('should insertOne documents passing deep validation', async () => {
  const wife = {
    name: {type: String}
  }
  const schema = {
    _id: {type: 'ID'},
    wife: {type: wife}
  }
  const model = new Model({name: generateId(), schema})
  const Tests = await new Collection({name: generateId(), model}).await()

  await Tests.insertOne({'wife.name': 'Francisca'})
})

it('should clean a document before insertOneing', async () => {
  const now = new Date()
  const schema = {
    _id: {type: 'ID'},
    name: {type: String},
    createdAt: {type: Date, autoValue: () => now}
  }
  const model = new Model({name: generateId(), schema})
  const Tests = await new Collection({name: generateId(), model}).await()

  const docId = await Tests.insertOne({name: 1234})
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
    await Tests.insertOne({})
  } catch (error) {
    expect(error.code).toBe('validationError')
  }
})
