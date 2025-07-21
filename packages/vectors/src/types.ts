import {EncryptionConfiguration, MetadataConfiguration} from '@aws-sdk/client-s3vectors'

/**
 * Distance metrics for vector similarity calculations
 */
export type DistanceMetric = 'cosine' | 'euclidean'

/**
 * Vector data types supported
 */
export type VectorDataType = 'float32'

/**
 * Configuration for a vector index
 */
export interface VectorIndexConfig {
  /**
   * Number of dimensions in each vector (1-4096)
   */
  dimension: number

  /**
   * Distance metric for similarity calculations
   */
  distanceMetric: DistanceMetric

  /**
   * Metadata configuration for the index
   */
  metadataConfiguration?: MetadataConfiguration
}

/**
 * Configuration for defining a vector store
 */
export interface VectorStoreConfig {
  /**
   * Name of the vector store/bucket (3-63 characters, lowercase letters, numbers, hyphens)
   */
  storeName: string

  /**
   * Array of vector indexes to create in this store
   */
  index: VectorIndexConfig

  /**
   * Optional encryption configuration
   */
  encryptionConfiguration?: EncryptionConfiguration
}

/**
 * Vector data for insertion
 */
export interface VectorData<
  TMetadata extends Record<string, string | number | boolean> = Record<
    string,
    string | number | boolean
  >,
> {
  /** Unique identifier for the vector */
  key: string

  /**
   * The vector data of the vector.
   * Vector dimensions must match the dimension count that's configured for the vector index.
   * For the cosine distance metric, zero vectors (vectors containing all zeros) aren't allowed.
   * For both cosine and euclidean distance metrics, vector data must contain only valid floating-point values. Invalid values such as NaN (Not a Number) or Infinity aren't allowed.
   */
  vector: number[]

  /** Filterable metadata attached to the vector */
  metadata?: TMetadata
}

/**
 * Query parameters for vector similarity search
 */
export interface VectorQueryParams {
  /** The query vector to search for similar vectors */
  queryVector: {
    [K in VectorDataType]: number[]
  }

  /** Number of top similar vectors to return */
  topK: number

  /** Optional metadata filters to narrow search results */
  filter?: Record<string, string | number | boolean>

  /** Whether to return distance scores */
  returnDistance?: boolean

  /** Whether to return metadata */
  returnMetadata?: boolean
}

/**
 * Result from a vector query
 */
export interface VectorQueryResult {
  /** The vector key */
  key: string

  /** Distance score (if requested) */
  distance?: number

  /** Vector metadata (if requested) */
  metadata?: Record<string, string | number | boolean>
}
