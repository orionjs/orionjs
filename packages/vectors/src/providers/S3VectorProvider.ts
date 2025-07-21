import type {VectorStorageProvider, VectorStorageProviderConfig} from '../VectorStorageProvider'
import type {VectorStoreConfig, VectorIndexConfig} from '../types'
import {
  CreateVectorBucketCommand,
  GetVectorBucketCommand,
  NotFoundException,
  S3VectorsClient,
  S3VectorsClientConfig,
} from '@aws-sdk/client-s3vectors'
import {S3VectorStore} from './S3VectorStore'

/**
 * Configuration for AWS S3 Vector provider
 */
export interface S3VectorProviderConfig extends VectorStorageProviderConfig {
  s3Options: S3VectorsClientConfig
}

/**
 * AWS S3 Vector storage provider implementation
 *
 * This provider implements vector storage using AWS S3's native vector capabilities.
 * It manages vector buckets and indexes according to the S3 Vector API.
 */
export class S3VectorProvider implements VectorStorageProvider {
  private config: S3VectorProviderConfig
  private client: S3VectorsClient

  constructor(config: S3VectorProviderConfig) {
    this.config = config
    this.validateConfig()
    this.client = new S3VectorsClient(this.config.s3Options)
  }

  /**
   * Validate the provider configuration
   */
  private validateConfig(): void {
    if (!this.config.s3Options) {
      throw new Error('S3Options are required for S3VectorProvider')
    }
  }

  createVectorStore(config: VectorStoreConfig) {
    this.validateVectorStoreConfig(config)

    this.setupVectorStore(config)

    // Return a VectorStore instance
    return new S3VectorStore(this.client, config)
  }

  private async setupVectorStore(config: VectorStoreConfig): Promise<void> {
    // Ensure the vector bucket exists
    await this.ensureVectorBucketExists(config)
  }

  private async storeExists(storeName: string): Promise<boolean> {
    try {
      await this.client.send(
        new GetVectorBucketCommand({
          vectorBucketName: storeName,
        }),
      )

      return true
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return false
      }
      throw error
    }
  }

  /**
   * Ensure a vector bucket exists, create if it doesn't
   */
  private async ensureVectorBucketExists(config: VectorStoreConfig): Promise<void> {
    const exists = await this.storeExists(config.storeName)
    if (!exists) {
      await this.createVectorBucket(config)
    }
  }

  /**
   * Create a new vector bucket
   */
  private async createVectorBucket(config: VectorStoreConfig): Promise<void> {
    await this.client.send(
      new CreateVectorBucketCommand({
        vectorBucketName: config.storeName,
        encryptionConfiguration: config.encryptionConfiguration,
      }),
    )
  }

  /**
   * Validate vector store configuration
   */
  private validateVectorStoreConfig(config: VectorStoreConfig): void {
    if (!config.storeName || config.storeName.length < 3 || config.storeName.length > 63) {
      throw new Error('Store name must be between 3 and 63 characters')
    }

    if (!/^[a-z0-9-]+$/.test(config.storeName)) {
      throw new Error('Store name must contain only lowercase letters, numbers, and hyphens')
    }

    if (!config.index) {
      throw new Error('Index must be specified')
    }

    this.validateIndexConfig(config.index)
  }

  /**
   * Validate vector index configuration
   */
  private validateIndexConfig(indexConfig: VectorIndexConfig): void {
    if (indexConfig.dimension < 1 || indexConfig.dimension > 4096) {
      throw new Error('Vector dimension must be between 1 and 4096')
    }

    if (!['cosine', 'euclidean'].includes(indexConfig.distanceMetric)) {
      throw new Error('Distance metric must be either "cosine" or "euclidean"')
    }
  }

  /**
   * Check if an error indicates a resource was not found
   */
  private isNotFoundError(error: unknown): boolean {
    if (error instanceof NotFoundException) {
      return true
    }
    return false
  }
}
