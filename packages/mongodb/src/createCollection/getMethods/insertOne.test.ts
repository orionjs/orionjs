import createInsert from './insertOne'
import {generateId} from '@orion-js/helpers'
import createCollection from '..'
import {createModel} from '@orion-js/models'

describe('InsertOne', () => {
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
      wife: {type: wife}
    }
    const model = createModel({name: generateId(), schema})
    const Tests = createCollection({name: generateId(), model})

    await Tests.insertOne({'wife.name': 'Francisca'})
  })

  it('should clean a document before insertOneing', async () => {
    const now = new Date()
    const schema = {
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
    const schema = {name: {type: String}}
    const model = createModel({name: generateId(), schema})
    const Tests = createCollection({name: generateId(), model})

    expect.assertions(1)
    try {
      await Tests.insertOne({})
    } catch (error) {
      expect(error.code).toBe('validationError')
    }
  })

  it('Should be able to use custom clean for models', async () => {
    const model = createModel({
      name: 'File',
      schema: {
        name: {type: String}
      },
      async clean(value) {
        if (!value) return null
        return {
          ...value,
          name: value.name.toUpperCase() + value._id
        }
      }
    })

    const Tests = createCollection({name: generateId(), model})
    const docId = await Tests.insertOne({name: 'hello'})
    const result = await Tests.findOne(docId)
    expect(result.name).toBe('HELLO' + docId)
  })

  it('should throw unique index errors', async () => {
    const Tests = createCollection({
      name: generateId(),
      indexes: [
        {
          keys: {
            name: 1
          },
          options: {
            unique: true
          }
        }
      ]
    })
    await Tests.createIndexesPromise

    console.log(await Tests.rawCollection.listIndexes().toArray())

    await Tests.insertOne({name: 'one'})

    expect.assertions(3)
    try {
      await Tests.insertOne({name: 'one'})
    } catch (error) {
      expect(error.code).toBe('validationError')
      expect(error.validationErrors).toHaveProperty('unknownKey')
      expect(error.validationErrors.unknownKey).toBe('notUnique')
      /**
       * This should work on a real db, but on memory-server it doesnt give the name of the index.
       */
      // expect(error.code).toBe('validationError')
      // expect(error.validationErrors).toHaveProperty('name')
      // expect(error.validationErrors.name).toBe('notUnique')
    }
  })
})
