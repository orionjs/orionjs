import {describe, it, expect} from 'vitest'
import type {
  DistanceMetric,
  VectorDataType,
  VectorIndexConfig,
  VectorStoreConfig,
  VectorData,
  VectorQueryParams,
  VectorQueryResult,
} from '../types'

describe('Vector Types', () => {
  describe('DistanceMetric', () => {
    it('should accept valid distance metrics', () => {
      const cosine: DistanceMetric = 'cosine'
      const euclidean: DistanceMetric = 'euclidean'

      expect(cosine).toBe('cosine')
      expect(euclidean).toBe('euclidean')
    })
  })

  describe('VectorDataType', () => {
    it('should accept valid vector data types', () => {
      const float32: VectorDataType = 'float32'

      expect(float32).toBe('float32')
    })
  })

  describe('VectorIndexConfig', () => {
    it('should create valid index config', () => {
      const config: VectorIndexConfig = {
        name: 'test-index',
        dimension: 768,
        distanceMetric: 'cosine',
        nonFilterableMetadataKeys: ['source_text'],
      }

      expect(config.name).toBe('test-index')
      expect(config.dimension).toBe(768)
      expect(config.distanceMetric).toBe('cosine')
      expect(config.nonFilterableMetadataKeys).toEqual(['source_text'])
    })

    it('should create minimal index config', () => {
      const config: VectorIndexConfig = {
        name: 'simple-index',
        dimension: 128,
        distanceMetric: 'euclidean',
      }

      expect(config.name).toBe('simple-index')
      expect(config.dimension).toBe(128)
      expect(config.distanceMetric).toBe('euclidean')
      expect(config.nonFilterableMetadataKeys).toBeUndefined()
    })
  })

  describe('VectorStoreConfig', () => {
    it('should create valid store config', () => {
      const config: VectorStoreConfig = {
        storeName: 'test-store',
        indexes: [
          {
            name: 'index-1',
            dimension: 768,
            distanceMetric: 'cosine',
          },
          {
            name: 'index-2',
            dimension: 1536,
            distanceMetric: 'euclidean',
            nonFilterableMetadataKeys: ['metadata'],
          },
        ],
        encryption: {
          type: 'SSE-S3',
        },
      }

      expect(config.storeName).toBe('test-store')
      expect(config.indexes).toHaveLength(2)
      expect(config.encryption?.type).toBe('SSE-S3')
    })

    it('should create minimal store config', () => {
      const config: VectorStoreConfig = {
        storeName: 'simple-store',
        indexes: [
          {
            name: 'simple-index',
            dimension: 256,
            distanceMetric: 'cosine',
          },
        ],
      }

      expect(config.storeName).toBe('simple-store')
      expect(config.indexes).toHaveLength(1)
      expect(config.encryption).toBeUndefined()
    })
  })

  describe('VectorData', () => {
    it('should create valid vector data', () => {
      const vector: VectorData = {
        key: 'document-123',
        data: {
          float32: [0.1, 0.2, 0.3, 0.4],
        },
        metadata: {
          title: 'Test Document',
          category: 'example',
          score: 0.95,
          isPublic: true,
        },
      }

      expect(vector.key).toBe('document-123')
      expect(vector.data.float32).toEqual([0.1, 0.2, 0.3, 0.4])
      expect(vector.metadata?.title).toBe('Test Document')
      expect(vector.metadata?.category).toBe('example')
      expect(vector.metadata?.score).toBe(0.95)
      expect(vector.metadata?.isPublic).toBe(true)
    })

    it('should create minimal vector data', () => {
      const vector: VectorData = {
        key: 'simple-vector',
        data: {
          float32: [1, 0, 0],
        },
      }

      expect(vector.key).toBe('simple-vector')
      expect(vector.data.float32).toEqual([1, 0, 0])
      expect(vector.metadata).toBeUndefined()
    })
  })

  describe('VectorQueryParams', () => {
    it('should create comprehensive query params', () => {
      const params: VectorQueryParams = {
        queryVector: {
          float32: [0.5, 0.3, 0.8],
        },
        topK: 10,
        filter: {
          category: 'science',
          isPublic: true,
          score: 0.8,
        },
        returnDistance: true,
        returnMetadata: true,
      }

      expect(params.queryVector.float32).toEqual([0.5, 0.3, 0.8])
      expect(params.topK).toBe(10)
      expect(params.filter?.category).toBe('science')
      expect(params.filter?.isPublic).toBe(true)
      expect(params.filter?.score).toBe(0.8)
      expect(params.returnDistance).toBe(true)
      expect(params.returnMetadata).toBe(true)
    })

    it('should create minimal query params', () => {
      const params: VectorQueryParams = {
        queryVector: {
          float32: [1, 0, 0],
        },
        topK: 5,
      }

      expect(params.queryVector.float32).toEqual([1, 0, 0])
      expect(params.topK).toBe(5)
      expect(params.filter).toBeUndefined()
      expect(params.returnDistance).toBeUndefined()
      expect(params.returnMetadata).toBeUndefined()
    })
  })

  describe('VectorQueryResult', () => {
    it('should create comprehensive query result', () => {
      const result: VectorQueryResult = {
        key: 'result-vector',
        distance: 0.25,
        metadata: {
          title: 'Similar Document',
          category: 'example',
          relevance: 'high',
        },
      }

      expect(result.key).toBe('result-vector')
      expect(result.distance).toBe(0.25)
      expect(result.metadata?.title).toBe('Similar Document')
      expect(result.metadata?.category).toBe('example')
      expect(result.metadata?.relevance).toBe('high')
    })

    it('should create minimal query result', () => {
      const result: VectorQueryResult = {
        key: 'simple-result',
      }

      expect(result.key).toBe('simple-result')
      expect(result.distance).toBeUndefined()
      expect(result.metadata).toBeUndefined()
    })
  })

  describe('Type compatibility', () => {
    it('should allow metadata with mixed value types', () => {
      const metadata: Record<string, string | number | boolean> = {
        stringValue: 'test',
        numberValue: 42,
        booleanValue: true,
      }

      const vector: VectorData = {
        key: 'mixed-metadata',
        data: {float32: [1, 2, 3]},
        metadata,
      }

      expect(vector.metadata?.stringValue).toBe('test')
      expect(vector.metadata?.numberValue).toBe(42)
      expect(vector.metadata?.booleanValue).toBe(true)
    })

    it('should work with multiple vector data types', () => {
      // Currently only float32 is supported, but the type system is extensible
      const vectorData: {[K in VectorDataType]: number[]} = {
        float32: [0.1, 0.2, 0.3],
      }

      expect(vectorData.float32).toEqual([0.1, 0.2, 0.3])
    })
  })
})
