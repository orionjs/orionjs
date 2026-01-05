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

  it('Should log indexes that have to be deleted when index exists in DB but not in any definition', async () => {
    const collectionName = generateId()

    // Create a collection and manually create an extra index in MongoDB
    const collection1 = createCollection({
      name: collectionName,
      indexes: [{keys: {a: 1}}],
    })
    await collection1.startConnection()
    await collection1.createIndexesPromise

    // Manually create an index that is NOT defined in any createCollection() call
    await collection1.rawCollection.createIndex({orphanedIndex: 1})

    logger.warn = vi.fn(() => Math.random())

    // Create another collection reference - the orphanedIndex should be flagged
    const collection2 = createCollection({
      name: collectionName,
      indexes: [{keys: {b: 1}}],
    })
    await collection2.startConnection()
    await collection2.createIndexesPromise

    // Should warn about orphanedIndex_1 (not defined in any createCollection)
    expect(logger.warn).toHaveBeenCalled()
  })

  it('Should NOT warn when indexes are split across multiple createCollection calls', async () => {
    const collectionName = generateId()

    // First createCollection with index {a: 1}
    const collection1 = createCollection({
      name: collectionName,
      indexes: [{keys: {a: 1}}],
    })
    await collection1.startConnection()
    await collection1.createIndexesPromise

    logger.warn = vi.fn()

    // Second createCollection with different index {ba: 1} - should merge, not warn
    const collection2 = createCollection({
      name: collectionName,
      indexes: [{keys: {ba: 1}}],
    })
    await collection2.startConnection()
    await collection2.createIndexesPromise

    // Should NOT warn because both indexes are in the merged registry
    expect(logger.warn).not.toHaveBeenCalled()
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
