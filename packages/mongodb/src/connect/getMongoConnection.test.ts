import {generateId} from '@orion-js/helpers'
import {getMongoConnection} from '.'
import {describe, test, expect} from 'vitest'
import {createCollection} from '../createCollection'

describe('Get Mongo Connection', () => {
  test('Should get mongo connection for main connection', async () => {
    const mongoConnection = getMongoConnection({name: 'main'})
    await mongoConnection.startConnection()
    expect(mongoConnection).toBeDefined()
    expect(mongoConnection.uri).toBe(process.env.MONGO_URL)
  })

  test('Should get mongo connection for other connections defined by process env', async () => {
    process.env.MONGO_URL_NICO = `${process.env.MONGO_URL}other`

    const mongoConnection = getMongoConnection({name: 'nico'})
    await mongoConnection.startConnection()

    expect(mongoConnection).toBeDefined()
    expect(mongoConnection.uri).toBe(process.env.MONGO_URL_NICO)
  })

  test('Should create a collection using custom connection with env', async () => {
    process.env.MONGO_URL_NICO2 = `${process.env.MONGO_URL}other2`

    const collection = createCollection({
      name: generateId(),
      connectionName: 'nico2',
    })

    await collection.startConnection()

    expect(collection.connectionName).toBe('nico2')
    expect(collection.client.uri).toBe(process.env.MONGO_URL_NICO2)
  })

  test('Should throw the correct error when no mongo url env is defined', async () => {
    expect.assertions(1)

    try {
      const collection = createCollection({
        name: generateId(),
        connectionName: 'nico3',
      })

      await collection.startConnection()
    } catch (error) {
      expect(error.message).toBe(
        `To use the connection "nico3" you must initialize it first calling getMongoConnection({name: "nico3", uri: "MONGOURI"}) or setting the environment variable MONGO_URL_NICO3.`,
      )
    }
  })

  test('Should connect to the db automatically without needing to call startConnection', async () => {
    process.env.MONGO_URL_NICO4 = `${process.env.MONGO_URL}othe4`
    const collection = createCollection({
      name: generateId(),
      connectionName: 'nico4',
    })

    await collection.insertOne({name: 'test'})

    expect(await collection.findOne({name: 'test'})).toBeDefined()
  })

  test('Should return the same connection promise for the same connection name', async () => {
    process.env.MONGO_URL_NICO5 = `${process.env.MONGO_URL}other5`
    const collection = createCollection({
      name: generateId(),
      connectionName: 'nico5',
    })

    const collection2 = createCollection({
      name: generateId(),
      connectionName: 'nico5',
    })

    // check if is resolved
    expect(collection.connectionPromise).toBe(collection2.connectionPromise)
  })

  test('Connection promise should resolve when the connection is started', async () => {
    process.env.MONGO_URL_NICO6 = `${process.env.MONGO_URL}other6`

    const collection = createCollection({
      name: generateId(),
      connectionName: 'nico6',
    })

    let resolved = false
    collection.connectionPromise.then(() => {
      resolved = true
    })

    expect(resolved).toBe(false)

    collection.startConnection()

    await collection.connectionPromise

    expect(resolved).toBe(true)
  })
})
