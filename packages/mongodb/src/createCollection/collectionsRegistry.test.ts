import {generateId} from '@orion-js/helpers'
import {createCollection} from '.'
import {it, describe, expect, vi, beforeEach} from 'vitest'
import {logger} from '@orion-js/logger'
import {
  collectionsRegistry,
  getRegisteredCollections,
  deleteAllUnusedIndexes,
} from './collectionsRegistry'

describe('collectionsRegistry', () => {
  it('should register collections when created', async () => {
    const collectionName = generateId()
    const collection = createCollection({
      name: collectionName,
      indexes: [{keys: {a: 1}}],
    })

    await collection.startConnection()

    // Verify collection is registered
    const registeredCollections = getRegisteredCollections('main')
    const found = registeredCollections.find(c => c.name === collectionName)
    expect(found).toBeDefined()
    expect(found.name).toBe(collectionName)
  })

  it('should return empty array for unknown connection', () => {
    const collections = getRegisteredCollections('nonexistent_connection')
    expect(collections).toEqual([])
  })
})

describe('deleteAllUnusedIndexes', () => {
  beforeEach(() => {
    // Clear registry for clean test state
    collectionsRegistry.clear()
  })

  it('should delete unused indexes from all registered collections', async () => {
    const collectionName1 = generateId()
    const collectionName2 = generateId()

    // Create first collection with two indexes
    const collection1 = createCollection({
      name: collectionName1,
      indexes: [{keys: {a: 1}}, {keys: {b: 1}}],
    })
    await collection1.startConnection()
    await collection1.createIndexesPromise

    // Create second collection with two indexes
    const collection2 = createCollection({
      name: collectionName2,
      indexes: [{keys: {x: 1}}, {keys: {y: 1}}],
    })
    await collection2.startConnection()
    await collection2.createIndexesPromise

    // Re-create collections with only one index each (simulating index removal)
    collectionsRegistry.clear()

    const collection1Updated = createCollection({
      name: collectionName1,
      indexes: [{keys: {a: 1}}],
    })
    await collection1Updated.startConnection()

    const collection2Updated = createCollection({
      name: collectionName2,
      indexes: [{keys: {x: 1}}],
    })
    await collection2Updated.startConnection()

    // Mock logger
    logger.info = vi.fn()

    // Delete all unused indexes
    const results = await deleteAllUnusedIndexes('main')

    // Verify results
    expect(results).toHaveLength(2)

    const result1 = results.find(r => r.collectionName === collectionName1)
    const result2 = results.find(r => r.collectionName === collectionName2)

    expect(result1.deletedIndexes).toContain('b_1')
    expect(result2.deletedIndexes).toContain('y_1')
  })

  it('should warn when no collections registered for connection', async () => {
    logger.warn = vi.fn()

    const results = await deleteAllUnusedIndexes('unknown_connection')

    expect(results).toEqual([])
    expect(logger.warn).toHaveBeenCalledWith(
      'No collections registered for connection "unknown_connection"',
    )
  })

  it('should only return results for collections that had indexes deleted', async () => {
    const collectionName = generateId()

    // Create collection with one index
    const collection = createCollection({
      name: collectionName,
      indexes: [{keys: {a: 1}}],
    })
    await collection.startConnection()
    await collection.createIndexesPromise

    // Delete unused indexes (there shouldn't be any)
    const results = await deleteAllUnusedIndexes('main')

    // Filter to only check our test collection
    const ourResult = results.find(r => r.collectionName === collectionName)
    expect(ourResult).toBeUndefined() // No result because no indexes were deleted
  })
})
