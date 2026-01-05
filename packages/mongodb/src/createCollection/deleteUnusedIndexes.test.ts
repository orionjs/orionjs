import {generateId} from '@orion-js/helpers'
import {createCollection} from '.'
import {it, describe, expect, vi} from 'vitest'
import {logger} from '@orion-js/logger'
import {keysMatch, isIndexDefined} from './deleteUnusedIndexes'
import {getIndexOptions, getIndexName} from './getIndexOptions'

describe('keysMatch', () => {
  it('should match identical simple keys', () => {
    expect(keysMatch({a: 1}, {a: 1})).toBe(true)
  })

  it('should match identical compound keys in same order', () => {
    expect(keysMatch({a: 1, b: -1}, {a: 1, b: -1})).toBe(true)
  })

  it('should not match compound keys in different order', () => {
    expect(keysMatch({a: 1, b: -1}, {b: -1, a: 1})).toBe(false)
  })

  it('should not match keys with different values', () => {
    expect(keysMatch({a: 1}, {a: -1})).toBe(false)
  })

  it('should not match keys with different field names', () => {
    expect(keysMatch({a: 1}, {b: 1})).toBe(false)
  })

  it('should not match keys with different lengths', () => {
    expect(keysMatch({a: 1}, {a: 1, b: 1})).toBe(false)
  })

  it('should match special index types like text', () => {
    expect(keysMatch({content: 'text'}, {content: 'text'})).toBe(true)
  })

  it('should match 2dsphere index types', () => {
    expect(keysMatch({location: '2dsphere'}, {location: '2dsphere'})).toBe(true)
  })

  it('should match hashed index types', () => {
    expect(keysMatch({userId: 'hashed'}, {userId: 'hashed'})).toBe(true)
  })
})

describe('isIndexDefined', () => {
  it('should find index by matching keys', () => {
    const definedIndexes = [{keys: {a: 1, b: -1}}]
    const currentIndex = {key: {a: 1, b: -1}, name: 'a_1_b_-1'}
    expect(isIndexDefined(definedIndexes, currentIndex)).toBe(true)
  })

  it('should find index by custom name using deprecated options format', () => {
    const definedIndexes = [{keys: {a: 1}, options: {name: 'my_custom_index'}}]
    const currentIndex = {key: {a: 1}, name: 'my_custom_index'}
    expect(isIndexDefined(definedIndexes, currentIndex)).toBe(true)
  })

  it('should find index by custom name using new flat format', () => {
    const definedIndexes = [{keys: {a: 1}, name: 'my_flat_index'}]
    const currentIndex = {key: {a: 1}, name: 'my_flat_index'}
    expect(isIndexDefined(definedIndexes, currentIndex)).toBe(true)
  })

  it('should not find index with different keys', () => {
    const definedIndexes = [{keys: {a: 1}}]
    const currentIndex = {key: {b: 1}, name: 'b_1'}
    expect(isIndexDefined(definedIndexes, currentIndex)).toBe(false)
  })

  it('should prioritize custom name over key matching', () => {
    // Custom name takes precedence, even if keys differ
    const definedIndexes = [{keys: {a: 1}, options: {name: 'my_index'}}]
    const currentIndex = {key: {a: 1}, name: 'my_index'}
    expect(isIndexDefined(definedIndexes, currentIndex)).toBe(true)
  })
})

describe('getIndexOptions', () => {
  it('should return undefined for index with no options', () => {
    const result = getIndexOptions({keys: {a: 1}})
    expect(result).toBeUndefined()
  })

  it('should extract flat options', () => {
    const result = getIndexOptions({keys: {a: 1}, unique: true, sparse: true})
    expect(result).toEqual({unique: true, sparse: true})
  })

  it('should extract deprecated nested options', () => {
    const result = getIndexOptions({keys: {a: 1}, options: {unique: true}})
    expect(result).toEqual({unique: true})
  })

  it('should merge flat and deprecated options, with flat taking precedence', () => {
    const result = getIndexOptions({
      keys: {a: 1},
      unique: true,
      options: {unique: false, sparse: true},
    })
    // Flat options take precedence
    expect(result).toEqual({unique: true, sparse: true})
  })
})

describe('getIndexName', () => {
  it('should return undefined when no name is provided', () => {
    expect(getIndexName({keys: {a: 1}})).toBeUndefined()
  })

  it('should return flat name', () => {
    expect(getIndexName({keys: {a: 1}, name: 'my_index'})).toBe('my_index')
  })

  it('should return deprecated options name', () => {
    expect(getIndexName({keys: {a: 1}, options: {name: 'my_index'}})).toBe('my_index')
  })

  it('should prioritize flat name over deprecated options name', () => {
    expect(
      getIndexName({keys: {a: 1}, name: 'flat_name', options: {name: 'deprecated_name'}}),
    ).toBe('flat_name')
  })
})

describe('index creation with both formats', () => {
  it('should create index with new flat format', async () => {
    const collectionName = generateId()

    const collection = createCollection({
      name: collectionName,
      indexes: [{keys: {email: 1}, unique: true, name: 'email_unique_idx'}],
    })
    await collection.startConnection()
    await collection.createIndexesPromise

    const indexes = await collection.rawCollection.indexes()
    const emailIndex = indexes.find(i => i.name === 'email_unique_idx')

    expect(emailIndex).toBeDefined()
    expect(emailIndex.unique).toBe(true)
  })

  it('should create index with deprecated options format', async () => {
    const collectionName = generateId()

    const collection = createCollection({
      name: collectionName,
      indexes: [{keys: {email: 1}, options: {unique: true, name: 'email_old_format'}}],
    })
    await collection.startConnection()
    await collection.createIndexesPromise

    const indexes = await collection.rawCollection.indexes()
    const emailIndex = indexes.find(i => i.name === 'email_old_format')

    expect(emailIndex).toBeDefined()
    expect(emailIndex.unique).toBe(true)
  })

  it('should merge flat and deprecated options when both provided', async () => {
    const collectionName = generateId()

    const collection = createCollection({
      name: collectionName,
      indexes: [
        {
          keys: {email: 1},
          name: 'merged_idx',
          sparse: true,
          options: {unique: true},
        },
      ],
    })
    await collection.startConnection()
    await collection.createIndexesPromise

    const indexes = await collection.rawCollection.indexes()
    const emailIndex = indexes.find(i => i.name === 'merged_idx')

    expect(emailIndex).toBeDefined()
    expect(emailIndex.unique).toBe(true)
    expect(emailIndex.sparse).toBe(true)
  })
})

describe('deleteUnusedIndexes', () => {
  it('should delete unused indexes from collection', async () => {
    const collectionName = generateId()

    // Create collection with two indexes
    const collection1 = createCollection({
      name: collectionName,
      indexes: [{keys: {a: 1}}, {keys: {b: 1}}],
    })
    await collection1.startConnection()
    await collection1.createIndexesPromise

    // Verify both indexes exist
    const indexesBefore = await collection1.rawCollection.indexes()
    expect(indexesBefore.map(i => i.name)).toContain('a_1')
    expect(indexesBefore.map(i => i.name)).toContain('b_1')

    // Create new collection reference with only one index defined
    const collection2 = createCollection({
      name: collectionName,
      indexes: [{keys: {a: 1}}],
    })
    await collection2.startConnection()

    // Mock logger to verify logging
    logger.info = vi.fn()

    // Delete unused indexes
    const result = await collection2.deleteUnusedIndexes()

    // Verify result
    expect(result.collectionName).toBe(collectionName)
    expect(result.deletedIndexes).toContain('b_1')
    expect(result.deletedIndexes).not.toContain('a_1')
    expect(result.deletedIndexes).not.toContain('_id_')

    // Verify index was actually deleted
    const indexesAfter = await collection2.rawCollection.indexes()
    expect(indexesAfter.map(i => i.name)).toContain('a_1')
    expect(indexesAfter.map(i => i.name)).not.toContain('b_1')
    expect(indexesAfter.map(i => i.name)).toContain('_id_')
  })

  it('should not delete any indexes when no indexes are defined', async () => {
    const collectionName = generateId()

    // Create collection with an index
    const collection1 = createCollection({
      name: collectionName,
      indexes: [{keys: {a: 1}}],
    })
    await collection1.startConnection()
    await collection1.createIndexesPromise

    // Create collection without defined indexes (safety measure)
    const collection2 = createCollection({
      name: collectionName,
      indexes: [],
    })
    await collection2.startConnection()

    // Delete should not remove anything for safety
    const result = await collection2.deleteUnusedIndexes()

    expect(result.deletedIndexes).toHaveLength(0)

    // Verify index still exists
    const indexes = await collection2.rawCollection.indexes()
    expect(indexes.map(i => i.name)).toContain('a_1')
  })

  it('should preserve _id_ index', async () => {
    const collectionName = generateId()

    const collection = createCollection({
      name: collectionName,
      indexes: [{keys: {a: 1}}],
    })
    await collection.startConnection()
    await collection.createIndexesPromise

    const result = await collection.deleteUnusedIndexes()

    expect(result.deletedIndexes).not.toContain('_id_')

    const indexes = await collection.rawCollection.indexes()
    expect(indexes.map(i => i.name)).toContain('_id_')
  })

  it('should handle compound indexes correctly', async () => {
    const collectionName = generateId()

    // Create collection with compound index
    const collection1 = createCollection({
      name: collectionName,
      indexes: [{keys: {a: 1, b: -1}}, {keys: {c: 1}}],
    })
    await collection1.startConnection()
    await collection1.createIndexesPromise

    // Create collection with same compound index (should not be deleted)
    const collection2 = createCollection({
      name: collectionName,
      indexes: [{keys: {a: 1, b: -1}}],
    })
    await collection2.startConnection()

    const result = await collection2.deleteUnusedIndexes()

    // Only c_1 should be deleted
    expect(result.deletedIndexes).toContain('c_1')
    expect(result.deletedIndexes).not.toContain('a_1_b_-1')
  })
})
