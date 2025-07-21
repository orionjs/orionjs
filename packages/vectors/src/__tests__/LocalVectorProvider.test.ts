import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {promises as fs} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {LocalVectorProvider} from '../providers/LocalVectorProvider'
import type {VectorStoreConfig, VectorData} from '../types'

describe('LocalVectorProvider', () => {
  let provider: LocalVectorProvider
  let testDir: string

  beforeEach(async () => {
    // Create a temporary directory for each test
    testDir = join(tmpdir(), `vectors-test-${Date.now()}-${Math.random()}`)
    await fs.mkdir(testDir, {recursive: true})

    provider = new LocalVectorProvider({
      basePath: testDir,
    })
  })

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, {recursive: true, force: true})
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('constructor', () => {
    it('should create provider with valid config', () => {
      expect(provider).toBeInstanceOf(LocalVectorProvider)
    })

    it('should throw error without basePath', () => {
      expect(() => new LocalVectorProvider({} as any)).toThrow(
        'Base path is required for LocalVectorProvider',
      )
    })
  })

  describe('createVectorStore', () => {
    it('should create store and indexes', async () => {
      const config: VectorStoreConfig = {
        storeName: 'test-store',
        indexes: [
          {
            name: 'test-index',
            dimension: 3,
            distanceMetric: 'cosine',
          },
        ],
      }

      await provider.createVectorStore(config)

      // Check store exists
      expect(await provider.storeExists('test-store')).toBe(true)
      expect(await provider.indexExists('test-store', 'test-index')).toBe(true)

      // Check file structure
      const storeMetadata = join(testDir, 'test-store', '.store.json')
      const indexMetadata = join(testDir, 'test-store', 'test-index', '.index.json')
      const vectorsFile = join(testDir, 'test-store', 'test-index', 'vectors.json')

      expect(
        await fs
          .access(storeMetadata)
          .then(() => true)
          .catch(() => false),
      ).toBe(true)
      expect(
        await fs
          .access(indexMetadata)
          .then(() => true)
          .catch(() => false),
      ).toBe(true)
      expect(
        await fs
          .access(vectorsFile)
          .then(() => true)
          .catch(() => false),
      ).toBe(true)
    })

    it('should validate store configuration', async () => {
      const invalidConfigs = [
        {
          storeName: 'ab',
          indexes: [{name: 'test', dimension: 3, distanceMetric: 'cosine' as const}],
        },
        {
          storeName: 'test_store',
          indexes: [{name: 'test', dimension: 3, distanceMetric: 'cosine' as const}],
        },
        {storeName: 'valid-store', indexes: []},
      ]

      for (const config of invalidConfigs) {
        await expect(provider.createVectorStore(config)).rejects.toThrow()
      }
    })

    it('should validate index configuration', async () => {
      const config: VectorStoreConfig = {
        storeName: 'test-store',
        indexes: [
          {
            name: 'ab', // Too short
            dimension: 3,
            distanceMetric: 'cosine',
          },
        ],
      }

      await expect(provider.createVectorStore(config)).rejects.toThrow(
        'Index name must be between 3 and 63 characters',
      )
    })
  })

  describe('vector operations', () => {
    beforeEach(async () => {
      await provider.createVectorStore({
        storeName: 'test-store',
        indexes: [
          {
            name: 'test-index',
            dimension: 3,
            distanceMetric: 'cosine',
          },
        ],
      })
    })

    it('should insert and retrieve vectors', async () => {
      const vectors: VectorData[] = [
        {
          key: 'vec1',
          data: {float32: [1, 0, 0]},
          metadata: {category: 'test', score: 0.9},
        },
        {
          key: 'vec2',
          data: {float32: [0, 1, 0]},
          metadata: {category: 'test', score: 0.8},
        },
      ]

      await provider.insertVectors('test-store', 'test-index', vectors)

      // Query all vectors
      const results = await provider.queryVectors('test-store', 'test-index', {
        queryVector: {float32: [1, 0, 0]},
        topK: 10,
        returnDistance: true,
        returnMetadata: true,
      })

      expect(results).toHaveLength(2)
      expect(results[0].key).toBe('vec1') // Should be closest
      expect(results[0].distance).toBeDefined()
      expect(results[0].metadata).toEqual({category: 'test', score: 0.9})
    })

    it('should update existing vectors', async () => {
      const vectors: VectorData[] = [
        {
          key: 'vec1',
          data: {float32: [1, 0, 0]},
          metadata: {category: 'original'},
        },
      ]

      await provider.insertVectors('test-store', 'test-index', vectors)

      // Update the same vector
      const updatedVectors: VectorData[] = [
        {
          key: 'vec1',
          data: {float32: [0, 1, 0]},
          metadata: {category: 'updated'},
        },
      ]

      await provider.insertVectors('test-store', 'test-index', updatedVectors)

      const results = await provider.queryVectors('test-store', 'test-index', {
        queryVector: {float32: [0, 1, 0]},
        topK: 1,
        returnMetadata: true,
      })

      expect(results).toHaveLength(1)
      expect(results[0].key).toBe('vec1')
      expect(results[0].metadata?.category).toBe('updated')
    })

    it('should filter by metadata', async () => {
      const vectors: VectorData[] = [
        {
          key: 'vec1',
          data: {float32: [1, 0, 0]},
          metadata: {category: 'A', public: true},
        },
        {
          key: 'vec2',
          data: {float32: [0, 1, 0]},
          metadata: {category: 'B', public: true},
        },
        {
          key: 'vec3',
          data: {float32: [0, 0, 1]},
          metadata: {category: 'A', public: false},
        },
      ]

      await provider.insertVectors('test-store', 'test-index', vectors)

      const results = await provider.queryVectors('test-store', 'test-index', {
        queryVector: {float32: [1, 0, 0]},
        topK: 10,
        filter: {category: 'A', public: true},
        returnMetadata: true,
      })

      expect(results).toHaveLength(1)
      expect(results[0].key).toBe('vec1')
    })

    it('should delete vectors', async () => {
      const vectors: VectorData[] = [
        {key: 'vec1', data: {float32: [1, 0, 0]}},
        {key: 'vec2', data: {float32: [0, 1, 0]}},
        {key: 'vec3', data: {float32: [0, 0, 1]}},
      ]

      await provider.insertVectors('test-store', 'test-index', vectors)

      // Delete some vectors
      await provider.deleteVectors('test-store', 'test-index', ['vec1', 'vec3'])

      const results = await provider.queryVectors('test-store', 'test-index', {
        queryVector: {float32: [1, 0, 0]},
        topK: 10,
      })

      expect(results).toHaveLength(1)
      expect(results[0].key).toBe('vec2')
    })

    it('should handle empty query results', async () => {
      const results = await provider.queryVectors('test-store', 'test-index', {
        queryVector: {float32: [1, 0, 0]},
        topK: 10,
      })

      expect(results).toHaveLength(0)
    })
  })

  describe('distance calculations', () => {
    beforeEach(async () => {
      await provider.createVectorStore({
        storeName: 'test-store',
        indexes: [
          {
            name: 'cosine-index',
            dimension: 2,
            distanceMetric: 'cosine',
          },
          {
            name: 'euclidean-index',
            dimension: 2,
            distanceMetric: 'euclidean',
          },
        ],
      })
    })

    it('should calculate cosine distance correctly', async () => {
      const vectors: VectorData[] = [
        {key: 'vec1', data: {float32: [1, 0]}}, // 90 degrees from query
        {key: 'vec2', data: {float32: [1, 1]}}, // 45 degrees from query
        {key: 'vec3', data: {float32: [0, 1]}}, // Same as query
      ]

      await provider.insertVectors('test-store', 'cosine-index', vectors)

      const results = await provider.queryVectors('test-store', 'cosine-index', {
        queryVector: {float32: [0, 1]},
        topK: 3,
        returnDistance: true,
      })

      expect(results).toHaveLength(3)
      expect(results[0].key).toBe('vec3') // Closest (same vector)
      expect(results[0].distance).toBeCloseTo(0, 5)
      expect(results[1].key).toBe('vec2') // Second closest
      expect(results[2].key).toBe('vec1') // Furthest
    })

    it('should calculate euclidean distance correctly', async () => {
      const vectors: VectorData[] = [
        {key: 'vec1', data: {float32: [3, 4]}}, // Distance 5 from origin
        {key: 'vec2', data: {float32: [1, 1]}}, // Distance ~1.414 from origin
        {key: 'vec3', data: {float32: [0, 0]}}, // Distance 0 from origin
      ]

      await provider.insertVectors('test-store', 'euclidean-index', vectors)

      const results = await provider.queryVectors('test-store', 'euclidean-index', {
        queryVector: {float32: [0, 0]},
        topK: 3,
        returnDistance: true,
      })

      expect(results).toHaveLength(3)
      expect(results[0].key).toBe('vec3') // Closest
      expect(results[0].distance).toBeCloseTo(0, 5)
      expect(results[1].key).toBe('vec2') // Second closest
      expect(results[1].distance).toBeCloseTo(Math.sqrt(2), 5)
      expect(results[2].key).toBe('vec1') // Furthest
      expect(results[2].distance).toBeCloseTo(5, 5)
    })
  })

  describe('store and index management', () => {
    it('should get index info', async () => {
      const config: VectorStoreConfig = {
        storeName: 'test-store',
        indexes: [
          {
            name: 'test-index',
            dimension: 128,
            distanceMetric: 'euclidean',
            nonFilterableMetadataKeys: ['source'],
          },
        ],
      }

      await provider.createVectorStore(config)

      const indexInfo = await provider.getIndexInfo('test-store', 'test-index')

      expect(indexInfo.name).toBe('test-index')
      expect(indexInfo.dimension).toBe(128)
      expect(indexInfo.distanceMetric).toBe('euclidean')
      expect(indexInfo.nonFilterableMetadataKeys).toEqual(['source'])
    })

    it('should delete index', async () => {
      await provider.createVectorStore({
        storeName: 'test-store',
        indexes: [{name: 'test-index', dimension: 3, distanceMetric: 'cosine'}],
      })

      expect(await provider.indexExists('test-store', 'test-index')).toBe(true)

      await provider.deleteIndex('test-store', 'test-index')

      expect(await provider.indexExists('test-store', 'test-index')).toBe(false)
    })

    it('should delete store', async () => {
      await provider.createVectorStore({
        storeName: 'test-store',
        indexes: [{name: 'test-index', dimension: 3, distanceMetric: 'cosine'}],
      })

      expect(await provider.storeExists('test-store')).toBe(true)

      await provider.deleteStore('test-store')

      expect(await provider.storeExists('test-store')).toBe(false)
    })
  })

  describe('validation', () => {
    beforeEach(async () => {
      await provider.createVectorStore({
        storeName: 'test-store',
        indexes: [{name: 'test-index', dimension: 3, distanceMetric: 'cosine'}],
      })
    })

    it('should validate vector data', async () => {
      const invalidVectors = [
        [], // Empty array
        [{key: '', data: {float32: [1, 0, 0]}}], // Empty key
        [{key: 'test', data: {}}], // Missing float32
        [{key: 'test', data: {float32: []}}], // Empty vector
      ]

      for (const vectors of invalidVectors) {
        await expect(
          provider.insertVectors('test-store', 'test-index', vectors as any),
        ).rejects.toThrow()
      }
    })

    it('should validate query parameters', async () => {
      const invalidQueries = [
        {queryVector: {}, topK: 1}, // Missing float32
        {queryVector: {float32: [1, 0, 0]}, topK: 0}, // Invalid topK
      ]

      for (const query of invalidQueries) {
        await expect(
          provider.queryVectors('test-store', 'test-index', query as any),
        ).rejects.toThrow()
      }
    })
  })
})
