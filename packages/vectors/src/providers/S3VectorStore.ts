import {
  CreateIndexCommand,
  DeleteIndexCommand,
  DeleteVectorsCommand,
  ListVectorsCommand,
  ListVectorsCommandInput,
  NotFoundException,
  PutVectorsCommand,
  QueryVectorsCommand,
  QueryVectorsCommandInput,
  S3VectorsClient,
} from '@aws-sdk/client-s3vectors'
import {VectorData, VectorIndexConfig, VectorStoreConfig} from '../types'
import {VectorStore} from '../VectorStore'

/**
 * S3 Vector Store implementation that provides CRUD operations for a specific vector store
 */
export class S3VectorStore<TVectorData extends VectorData = VectorData>
  implements VectorStore<TVectorData>
{
  private config: VectorStoreConfig
  private client: S3VectorsClient

  constructor(client: S3VectorsClient, config: VectorStoreConfig) {
    this.client = client
    this.config = config
  }

  private async wrapOperationWithIndexCreation<TOperation extends () => Promise<any>>(
    namespace: string,
    operation: TOperation,
  ): Promise<Awaited<ReturnType<TOperation>>> {
    try {
      return await operation()
    } catch (error) {
      if (error instanceof NotFoundException) {
        if (error.message === 'The specified index could not be found') {
          await this.createVectorIndex(namespace, this.config, this.config.index)
          return this.wrapOperationWithIndexCreation(namespace, operation)
        }
      }
      throw error
    }
  }

  async insertVectors(namespace: string, vectors: TVectorData[]) {
    return await this.wrapOperationWithIndexCreation(namespace, async () => {
      const result = await this.client.send(
        new PutVectorsCommand({
          vectorBucketName: this.config.storeName,
          indexName: namespace,
          vectors: vectors.map(vector => ({
            key: vector.key,
            data: {
              float32: vector.vector,
            },
            metadata: vector.metadata,
          })),
        }),
      )

      return result
    })
  }

  async queryVectors(
    namespace: string,
    options?: Omit<QueryVectorsCommandInput, 'vectorBucketName' | 'indexName' | 'queryVector'> & {
      queryVector: number[]
    },
  ) {
    return await this.wrapOperationWithIndexCreation(namespace, async () => {
      const result = await this.client.send(
        new QueryVectorsCommand({
          ...options,
          vectorBucketName: this.config.storeName,
          indexName: namespace,
          queryVector: {
            float32: options.queryVector,
          },
        }),
      )

      const vectors: TVectorData[] =
        result.vectors?.map(
          vector =>
            ({
              key: vector.key,
              vector: vector.data?.float32,
              metadata: vector.metadata,
            }) as TVectorData,
        ) ?? []

      return {
        vectors,
      }
    })
  }

  async deleteVectors(namespace: string, keys: string[]) {
    return await this.client.send(
      new DeleteVectorsCommand({
        vectorBucketName: this.config.storeName,
        indexName: namespace,
        keys,
      }),
    )
  }

  async listVectors(
    namespace: string,
    options?: Omit<ListVectorsCommandInput, 'vectorBucketName' | 'indexName'>,
  ) {
    return await this.wrapOperationWithIndexCreation(namespace, async () => {
      const result = await this.client.send(
        new ListVectorsCommand({
          vectorBucketName: this.config.storeName,
          indexName: namespace,
          ...options,
        }),
      )

      return (result.vectors?.map(vector => ({
        key: vector.key,
        vector: vector.data?.float32,
        metadata: vector.metadata as TVectorData['metadata'],
      })) ?? []) as Partial<TVectorData>[]
    })
  }

  async listVectorKeys(
    namespace: string,
    options?: Omit<
      ListVectorsCommandInput,
      'vectorBucketName' | 'indexName' | 'returnData' | 'returnMetadata'
    >,
  ) {
    const result = await this.listVectors(namespace, {
      ...options,
      returnData: false,
      returnMetadata: false,
    })
    return result.map(vector => vector.key)
  }

  /**
   * Create a new vector index
   */
  private async createVectorIndex(
    namespace: string,
    config: VectorStoreConfig,
    indexConfig: VectorIndexConfig,
  ): Promise<void> {
    await this.client.send(
      new CreateIndexCommand({
        indexName: namespace,
        dataType: 'float32',
        dimension: indexConfig.dimension,
        distanceMetric: indexConfig.distanceMetric,
        vectorBucketName: config.storeName,
        metadataConfiguration: indexConfig.metadataConfiguration,
      }),
    )
  }

  async deleteNamespace(namespace: string) {
    return await this.client.send(
      new DeleteIndexCommand({
        vectorBucketName: this.config.storeName,
        indexName: namespace,
      }),
    )
  }
}
