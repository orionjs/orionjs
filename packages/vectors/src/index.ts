/**
 * @orion-js/vectors
 *
 * A package for working with vector operations.
 * Provides interfaces and implementations for vector storage providers.
 */

// Core types and interfaces
export type {
  DistanceMetric,
  VectorDataType,
  VectorIndexConfig,
  VectorStoreConfig,
  VectorData,
  VectorQueryParams,
  VectorQueryResult,
} from './types'

// VectorStore interface and related types
export type {VectorStore} from './VectorStore'

// Provider interfaces
export type {
  VectorStorageProvider,
  VectorStorageProviderConfig,
} from './VectorStorageProvider'

// AWS S3 provider
export type {S3VectorProviderConfig} from './providers/S3VectorProvider'
export {S3VectorProvider} from './providers/S3VectorProvider'
