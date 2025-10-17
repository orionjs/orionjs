import {generateId} from '@orion-js/helpers'
import {createCollection, createIndexesPromises} from '.'
import {it, describe, expect, vi} from 'vitest'
import {logger} from '@orion-js/logger'

describe('Test indexes', () => {
  it('Should store all create indexes promises in the array', async () => {
    const collection = createCollection({
      name: generateId(),
      indexes: [{keys: {a: 1}, options: {unique: true}}],
    })

    await collection.startConnection()

    expect(createIndexesPromises).toContain(collection.createIndexesPromise)
  })

  it('Should create collection indexes correctly', async () => {
    const collection = createCollection({
      name: generateId(),
      indexes: [{keys: {a: 1}, options: {unique: true}}],
    })

    await collection.startConnection()

    const results = await collection.createIndexesPromise

    expect(results).toEqual(['a_1'])
  })

  it('Should handle error when cant create indexes', async () => {
    const collectionName = generateId()
    const collection1 = createCollection({
      name: collectionName,
    })

    await collection1.insertOne({a: 1})
    await collection1.insertOne({a: 1})

    console.error = vi.fn()

    const collection2 = createCollection({
      name: collectionName,
      indexes: [{keys: {a: 1}, options: {unique: true}}],
    })

    await collection2.startConnection()

    const result = await collection2.createIndexesPromise
    expect(result[0]).toContain('E11000')
    expect(console.error).toHaveBeenCalled()
  })

  it('Should log indexes that have to be deleted', async () => {
    const collectionName = generateId()
    const collection1 = createCollection({
      name: collectionName,
      indexes: [{keys: {a: 1}, options: {unique: true}}],
    })
    await collection1.startConnection()
    await collection1.createIndexesPromise

    logger.warn = vi.fn(() => Math.random())

    const collection2 = createCollection({
      name: collectionName,
      indexes: [{keys: {ba: 1}, options: {unique: true}}],
    })
    await collection2.startConnection()
    await collection2.createIndexesPromise

    expect(logger.warn).toHaveBeenCalled()
  })

  it('Should upgrade a index correctly', async () => {
    const collectionName = generateId()
    const collection1 = createCollection({
      name: collectionName,
      indexes: [{keys: {name: 1}}],
    })

    await collection1.startConnection()
    await collection1.createIndexesPromise

    console.info = vi.fn()

    const collection2 = createCollection({
      name: collectionName,
      indexes: [{keys: {name: 1}, options: {unique: true}}],
    })

    await collection2.startConnection()
    await collection2.createIndexesPromise

    expect(console.info).toHaveBeenCalled()
  })
})
