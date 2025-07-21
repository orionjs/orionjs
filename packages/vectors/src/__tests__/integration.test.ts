import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {promises as fs} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {LocalVectorProvider} from '../providers/LocalVectorProvider'
import type {VectorStorageProvider} from '../VectorStorageProvider'
import type {VectorStoreConfig, VectorData} from '../types'

/**
 * Interface compliance tests that can be run against any VectorStorageProvider implementation
 */
function testVectorStorageProvider(
  name: string,
  createProvider: () => Promise<{provider: VectorStorageProvider; cleanup: () => Promise<void>}>,
) {
  describe(`${name} - VectorStorageProvider compliance`, () => {
    let provider: VectorStorageProvider
    let cleanup: () => Promise<void>

    beforeEach(async () => {
      const setup = await createProvider()
      provider = setup.provider
      cleanup = setup.cleanup
    })

    afterEach(async () => {
      await cleanup()
    })

    it('should implement VectorStorageProvider interface', () => {
      expect(provider).toBeDefined()
      expect(typeof provider.createVectorStore).toBe('function')
      expect(typeof provider.storeExists).toBe('function')
      expect(typeof provider.indexExists).toBe('function')
      expect(typeof provider.insertVectors).toBe('function')
      expect(typeof provider.queryVectors).toBe('function')
      expect(typeof provider.deleteVectors).toBe('function')
      expect(typeof provider.getIndexInfo).toBe('function')
      expect(typeof provider.deleteIndex).toBe('function')
      expect(typeof provider.deleteStore).toBe('function')
    })

    it('should support full vector lifecycle', async () => {
      // 1. Define vector store
      const storeConfig: VectorStoreConfig = {
        storeName: 'integration-store',
        indexes: [
          {
            name: 'test-index',
            dimension: 3,
            distanceMetric: 'cosine',
            nonFilterableMetadataKeys: ['source'],
          },
        ],
      }

      await provider.createVectorStore(storeConfig)

      // 2. Verify store and index exist
      expect(await provider.storeExists('integration-store')).toBe(true)
      expect(await provider.indexExists('integration-store', 'test-index')).toBe(true)

      // 3. Insert vectors
      const vectors: VectorData[] = [
        {
          key: 'doc1',
          data: {float32: [1, 0, 0]},
          metadata: {category: 'A', score: 0.9, source: 'test'},
        },
        {
          key: 'doc2',
          data: {float32: [0, 1, 0]},
          metadata: {category: 'B', score: 0.8, source: 'test'},
        },
        {
          key: 'doc3',
          data: {float32: [0, 0, 1]},
          metadata: {category: 'A', score: 0.7, source: 'test'},
        },
      ]

      await provider.insertVectors('integration-store', 'test-index', vectors)

      // 4. Query vectors
      const results = await provider.queryVectors('integration-store', 'test-index', {
        queryVector: {float32: [1, 0, 0]},
        topK: 2,
        returnDistance: true,
        returnMetadata: true,
      })

      expect(results).toHaveLength(2)
      expect(results[0].key).toBe('doc1') // Should be closest
      expect(results[0].distance).toBeDefined()
      expect(results[0].metadata).toBeDefined()

      // 5. Query with filters
      const filteredResults = await provider.queryVectors('integration-store', 'test-index', {
        queryVector: {float32: [1, 0, 0]},
        topK: 10,
        filter: {category: 'A'},
        returnMetadata: true,
      })

      expect(filteredResults).toHaveLength(2)
      expect(filteredResults.every(r => r.metadata?.category === 'A')).toBe(true)

      // 6. Update vectors
      const updatedVectors: VectorData[] = [
        {
          key: 'doc1',
          data: {float32: [0.5, 0.5, 0]},
          metadata: {category: 'C', score: 0.95, source: 'updated'},
        },
      ]

      await provider.insertVectors('integration-store', 'test-index', updatedVectors)

      const afterUpdate = await provider.queryVectors('integration-store', 'test-index', {
        queryVector: {float32: [1, 0, 0]},
        topK: 1,
        returnMetadata: true,
      })

      expect(afterUpdate[0].metadata?.category).toBe('C')

      // 7. Delete vectors
      await provider.deleteVectors('integration-store', 'test-index', ['doc2'])

      const afterDelete = await provider.queryVectors('integration-store', 'test-index', {
        queryVector: {float32: [0, 1, 0]},
        topK: 10,
      })

      expect(afterDelete.every(r => r.key !== 'doc2')).toBe(true)

      // 8. Get index info
      const indexInfo = await provider.getIndexInfo('integration-store', 'test-index')
      expect(indexInfo.name).toBe('test-index')
      expect(indexInfo.dimension).toBe(3)
      expect(indexInfo.distanceMetric).toBe('cosine')

      // 9. Clean up
      await provider.deleteIndex('integration-store', 'test-index')
      expect(await provider.indexExists('integration-store', 'test-index')).toBe(false)

      await provider.deleteStore('integration-store')
      expect(await provider.storeExists('integration-store')).toBe(false)
    })

    it('should handle edge cases correctly', async () => {
      const storeConfig: VectorStoreConfig = {
        storeName: 'edge-case-store',
        indexes: [
          {
            name: 'edge-index',
            dimension: 2,
            distanceMetric: 'euclidean',
          },
        ],
      }

      await provider.createVectorStore(storeConfig)

      // Empty query should return empty results
      const emptyResults = await provider.queryVectors('edge-case-store', 'edge-index', {
        queryVector: {float32: [1, 0]},
        topK: 5,
      })
      expect(emptyResults).toHaveLength(0)

      // Delete non-existent vectors should not throw
      await expect(
        provider.deleteVectors('edge-case-store', 'edge-index', ['non-existent']),
      ).resolves.not.toThrow()

      // Insert single vector
      await provider.insertVectors('edge-case-store', 'edge-index', [
        {key: 'single', data: {float32: [1, 1]}},
      ])

      // Query with topK larger than available vectors
      const singleResult = await provider.queryVectors('edge-case-store', 'edge-index', {
        queryVector: {float32: [1, 1]},
        topK: 100,
      })
      expect(singleResult).toHaveLength(1)

      // Clean up
      await provider.deleteStore('edge-case-store')
    })

    it('should support multiple distance metrics', async () => {
      const storeConfig: VectorStoreConfig = {
        storeName: 'metrics-store',
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
      }

      await provider.createVectorStore(storeConfig)

      const testVectors: VectorData[] = [
        {key: 'v1', data: {float32: [1, 0]}},
        {key: 'v2', data: {float32: [0, 1]}},
      ]

      // Insert same vectors in both indexes
      await provider.insertVectors('metrics-store', 'cosine-index', testVectors)
      await provider.insertVectors('metrics-store', 'euclidean-index', testVectors)

      // Query with same vector but different metrics
      const cosineResults = await provider.queryVectors('metrics-store', 'cosine-index', {
        queryVector: {float32: [1, 0]},
        topK: 2,
        returnDistance: true,
      })

      const euclideanResults = await provider.queryVectors('metrics-store', 'euclidean-index', {
        queryVector: {float32: [1, 0]},
        topK: 2,
        returnDistance: true,
      })

      // Both should return same order (v1 first), but different distances
      expect(cosineResults[0].key).toBe('v1')
      expect(euclideanResults[0].key).toBe('v1')
      expect(cosineResults[0].distance).toBe(0) // Exact match
      expect(euclideanResults[0].distance).toBe(0) // Exact match

      // Different distances for second vector
      expect(cosineResults[1].distance).not.toBe(euclideanResults[1].distance)

      // Clean up
      await provider.deleteStore('metrics-store')
    })

    it('should validate configurations properly', async () => {
      // Invalid store configurations
      const invalidStoreConfigs = [
        {storeName: '', indexes: [{name: 'test', dimension: 3, distanceMetric: 'cosine' as const}]},
        {
          storeName: 'ab',
          indexes: [{name: 'test', dimension: 3, distanceMetric: 'cosine' as const}],
        },
        {
          storeName: 'invalid_name',
          indexes: [{name: 'test', dimension: 3, distanceMetric: 'cosine' as const}],
        },
        {storeName: 'valid-name', indexes: []},
      ]

      for (const config of invalidStoreConfigs) {
        await expect(provider.createVectorStore(config)).rejects.toThrow()
      }

      // Valid store with invalid index
      const invalidIndexConfig: VectorStoreConfig = {
        storeName: 'valid-store',
        indexes: [
          {
            name: 'invalid_index',
            dimension: 3,
            distanceMetric: 'cosine',
          },
        ],
      }

      await expect(provider.createVectorStore(invalidIndexConfig)).rejects.toThrow()
    })
  })
}

// Test LocalVectorProvider
describe('Integration Tests', () => {
  testVectorStorageProvider('LocalVectorProvider', async () => {
    const testDir = join(tmpdir(), `vectors-integration-${Date.now()}-${Math.random()}`)
    await fs.mkdir(testDir, {recursive: true})

    const provider = new LocalVectorProvider({
      basePath: testDir,
    })

    return {
      provider,
      cleanup: async () => {
        try {
          await fs.rm(testDir, {recursive: true, force: true})
        } catch {
          // Ignore cleanup errors
        }
      },
    }
  })

  // TODO: Add S3VectorProvider tests when AWS SDK implementation is ready
  // testVectorStorageProvider('S3VectorProvider', async () => {
  //   const provider = new S3VectorProvider({
  //     region: 'us-east-1',
  //     // Use localstack or mock for testing
  //   })
  //
  //   return {
  //     provider,
  //     cleanup: async () => {
  //       // Clean up test resources
  //     },
  //   }
  // })
})
