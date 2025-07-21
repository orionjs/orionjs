import type {VectorData} from './types'

/**
 * Interface for vector store operations providing CRUD functionality
 *
 * This interface defines the contract for vector storage implementations,
 * providing methods for creating, reading, updating, and deleting vectors
 * within a vector store.
 */
export interface VectorStore<TVectorData extends VectorData = VectorData> {
  insertVectors(namespace: string, vectors: TVectorData[], options?: any): Promise<any>

  deleteVectors(namespace: string, keys: string[], options?: any): Promise<any>

  listVectors(namespace: string, options?: any): Promise<Partial<TVectorData>[]>
  listVectorKeys(namespace: string, options?: any): Promise<string[]>

  deleteNamespace(namespace: string): Promise<any>

  queryVectors(
    namespace: string,
    options?: any,
  ): Promise<
    {
      vectors: TVectorData[]
    } & Record<string, any>
  >
}
