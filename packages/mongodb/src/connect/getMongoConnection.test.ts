import {generateId} from '@orion-js/helpers'
import {getMongoConnection} from '.'
import {createCollection} from '..'

describe('Get Mongo Connection', () => {
  test('Should get mongo connection for main connection', async () => {
    const mongoConnection = getMongoConnection({name: 'main'})
    await mongoConnection.connectionPromise
    expect(mongoConnection).toBeDefined()
    expect(mongoConnection.uri).toBe(process.env.MONGO_URL)
  })

  test('Should get mongo connection for other connections defined by process env', async () => {
    process.env.MONGO_URL_NICO = process.env.MONGO_URL + 'other'

    const mongoConnection = getMongoConnection({name: 'nico'})
    await mongoConnection.connectionPromise

    expect(mongoConnection).toBeDefined()
    expect(mongoConnection.uri).toBe(process.env.MONGO_URL_NICO)
  })

  test('Should create a collection using custom connection with env', async () => {
    process.env.MONGO_URL_NICO2 = process.env.MONGO_URL + 'other2'

    const collection = createCollection({
      name: generateId(),
      connectionName: 'nico2'
    })

    await collection.connectionPromise

    expect(collection.connectionName).toBe('nico2')
    expect(collection.client.uri).toBe(process.env.MONGO_URL_NICO2)
  })

  test('Should throw the correct error when no mongo url env is defined', async () => {
    expect.assertions(1)

    try {
      const collection = createCollection({
        name: generateId(),
        connectionName: 'nico3'
      })

      await collection.connectionPromise
    } catch (error) {
      expect(error.message).toBe(
        `To use the connection "nico3" you must initialize it first calling getMongoConnection({name: "nico3", uri: "MONGOURI"}) or setting the environment variable MONGO_URL_NICO3.`
      )
    }
  })
})
