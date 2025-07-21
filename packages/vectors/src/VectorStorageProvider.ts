import type {VectorStoreConfig} from './types'
import type {VectorStore} from './VectorStore'

/**
 * Abstract interface for vector storage providers
 *
 * This interface defines the contract that all vector storage implementations must follow.
 * It provides methods for managing vector stores, indexes, and performing vector operations.
 */
export interface VectorStorageProvider {
  /**
   * Create and ensure a vector store exists with the specified configuration.
   * This method will:
   * 1. Create the vector store/bucket if it doesn't exist
   * 2. Create all specified indexes if they don't exist
   * 3. Validate the configuration
   *
   * @param config - Configuration for the vector store and its indexes
   * @returns Promise that resolves to a VectorStore instance when setup is complete
   */
  createVectorStore(config: VectorStoreConfig): VectorStore
}

/**
 * Base configuration for vector storage providers
 */
export interface VectorStorageProviderConfig {
  /** Provider-specific configuration */
  [key: string]: unknown
}
