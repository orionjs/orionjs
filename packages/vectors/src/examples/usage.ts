/**
 * Example usage of the Vector Storage Provider
 *
 * This file demonstrates how to use the VectorStorageProvider interface
 * with both AWS S3 and Local implementations.
 */

import {S3VectorProvider} from '../providers/S3VectorProvider'
// import {LocalVectorProvider} from '../providers/LocalVectorProvider' // TODO: Implement LocalVectorProvider
import type {VectorStoreConfig} from '../types'

/**
 * Example: Setting up a Local Vector Provider for development/testing
 * NOTE: LocalVectorProvider is not implemented yet
 */
export async function setupLocalVectorProvider(): Promise<void> {
  // TODO: Implement LocalVectorProvider
  throw new Error('LocalVectorProvider is not implemented yet')

  // Initialize the Local Vector provider
  // const provider = new LocalVectorProvider({
  //   basePath: './vector-data', // Vectors will be stored in this directory
  // })

  // Define a vector store with multiple indexes
  // const vectorStoreConfig: VectorStoreConfig = {
  //   storeName: 'local-vector-store',
  //   indexes: [
  //     {
  //       name: 'embeddings-768',
  //       dimension: 768,
  //       distanceMetric: 'cosine',
  //     },
  //     {
  //       name: 'embeddings-1536',
  //       dimension: 1536,
  //       distanceMetric: 'euclidean',
  //     },
  //   ],
  // }

  // This method will:
  // 1. Create the vector store directory if it doesn't exist
  // 2. Create all specified indexes if they don't exist
  // 3. Validate the configuration
  // const vectorStore = await provider.createVectorStore(vectorStoreConfig)

  // console.log('Local vector store and indexes are ready!')
  // console.log('Files stored at:', './vector-data/local-vector-store/')
}

/**
 * Example: Setting up an AWS S3 Vector Provider
 */
export async function setupS3VectorProvider(): Promise<void> {
  // Initialize the S3 Vector provider
  const provider = new S3VectorProvider({
    s3Options: {
      region: 'us-east-1',
    },
  })

  // Define a vector store with multiple indexes
  const vectorStoreConfig: VectorStoreConfig = {
    storeName: 'my-vector-store',
    indexes: [
      {
        name: 'embeddings-768',
        dimension: 768,
        distanceMetric: 'cosine',
      },
      {
        name: 'embeddings-1536',
        dimension: 1536,
        distanceMetric: 'euclidean',
      },
    ],
    // encryptionConfiguration: {
    //   // TODO: Configure encryption according to AWS S3 Vector API
    // },
  }

  // This method will:
  // 1. Create the vector bucket if it doesn't exist
  // 2. Create all specified indexes if they don't exist
  // 3. Validate the configuration
  const vectorStore = await provider.createVectorStore(vectorStoreConfig)

  console.log('Vector store and indexes are ready!')
  console.log('VectorStore instance:', vectorStore)
}

/**
 * Example: Working with vectors (works with both providers)
 * NOTE: This example is commented out since LocalVectorProvider is not implemented
 */
export async function vectorOperationsExample(_isLocal = false): Promise<void> {
  // Choose provider based on environment
  // const provider = isLocal
  //   ? new LocalVectorProvider({basePath: './vector-data'})
  //   : new S3VectorProvider({
  //       s3Options: {
  //         region: 'us-east-1',
  //       },
  //     })

  // For now, only use S3 provider since LocalVectorProvider doesn't exist
  const provider = new S3VectorProvider({
    s3Options: {
      region: 'us-east-1',
    },
  })

  const storeName = 'my-vector-store'
  const indexName = 'embeddings-768'

  // Ensure store exists
  if (!(await provider.storeExists(storeName))) {
    const vectorStore = await provider.createVectorStore({
      storeName,
      indexes: [
        {
          name: indexName,
          dimension: 768,
          distanceMetric: 'cosine',
        },
      ],
    })
    console.log('Created vector store:', vectorStore)
  }

  // Insert vectors
  await provider.insertVectors(storeName, indexName, [
    {
      key: 'doc-1',
      data: {
        float32: new Array(768).fill(0).map(() => Math.random()),
      },
      metadata: {
        category: 'technology',
        importance: 0.8,
        isPublic: true,
      },
    },
    {
      key: 'doc-2',
      data: {
        float32: new Array(768).fill(0).map(() => Math.random()),
      },
      metadata: {
        category: 'science',
        importance: 0.9,
        isPublic: false,
      },
    },
  ])

  // Query for similar vectors
  const results = await provider.queryVectors(storeName, indexName, {
    queryVector: {
      float32: new Array(768).fill(0).map(() => Math.random()),
    },
    topK: 5,
    filter: {
      category: 'technology',
      isPublic: true,
    },
    returnDistance: true,
    returnMetadata: true,
  })

  console.log('Similar vectors found:', results)

  // Delete vectors
  await provider.deleteVectors(storeName, indexName, ['doc-1'])

  console.log('Vector operations completed!')
}

/**
 * Example: Running S3 Vector Provider workflow
 */
export async function runS3VectorWorkflow(): Promise<void> {
  try {
    console.log('Setting up S3 Vector Provider...')
    await setupS3VectorProvider()

    console.log('\nRunning vector operations...')
    await vectorOperationsExample(false) // Use S3 provider

    console.log('\nWorkflow completed successfully!')
  } catch (error) {
    console.error('Workflow failed:', error)
  }
}

/**
 * Example: Comparing local vs cloud performance
 * NOTE: This is commented out since LocalVectorProvider doesn't exist
 */
export async function performanceComparison(): Promise<void> {
  // TODO: Implement when LocalVectorProvider is available
  console.log('Performance comparison not available - LocalVectorProvider is not implemented yet')

  // const localProvider = new LocalVectorProvider({
  //   basePath: './perf-test-local',
  // })

  // Note: S3 provider would need real AWS setup for this comparison
  // const s3Provider = new S3VectorProvider({
  //   region: 'us-east-1',
  // })

  // const testData = Array.from({length: 1000}, (_, i) => ({
  //   key: `perf-vector-${i}`,
  //   data: {
  //     float32: Array.from({length: 256}, () => Math.random()),
  //   },
  //   metadata: {index: i, group: i % 10},
  // }))

  // const storeConfig = {
  //   storeName: 'perf-test-store',
  //   indexes: [
  //     {
  //       name: 'perf-index',
  //       dimension: 256,
  //       distanceMetric: 'cosine' as const,
  //     },
  //   ],
  // }

  // Test local provider
  // console.log('Testing local provider performance...')
  // const localStart = Date.now()

  // await localProvider.createVectorStore(storeConfig)
  // await localProvider.insertVectors('perf-test-store', 'perf-index', testData)

  // const localResults = await localProvider.queryVectors('perf-test-store', 'perf-index', {
  //   queryVector: {float32: Array.from({length: 256}, () => Math.random())},
  //   topK: 10,
  //   returnDistance: true,
  // })

  // const localTime = Date.now() - localStart
  // await localProvider.deleteStore('perf-test-store')

  // console.log(`Local provider: ${localTime}ms, ${localResults.length} results`)

  // Note: S3 provider test would go here when implemented
  console.log('S3 provider performance test: Not implemented (requires AWS setup)')
}

/**
 * Example: Managing stores and indexes
 * NOTE: This is commented out since LocalVectorProvider is not implemented
 */
export async function managementExample(): Promise<void> {
  // TODO: Implement when LocalVectorProvider is available
  console.log('Management example not available - LocalVectorProvider is not implemented yet')

  // const provider = new LocalVectorProvider({
  //   basePath: './management-test',
  // })

  // const storeName = 'management-store'
  // const indexName = 'management-index'

  // // Check if store exists
  // const storeExists = await provider.storeExists(storeName)
  // console.log('Store exists:', storeExists)

  // // Create store if it doesn't exist
  // if (!storeExists) {
  //   await provider.createVectorStore({
  //     storeName,
  //     indexes: [
  //       {
  //         name: indexName,
  //         dimension: 64,
  //         distanceMetric: 'euclidean',
  //       },
  //     ],
  //   })
  // }

  // // Check if index exists
  // const indexExists = await provider.indexExists(storeName, indexName)
  // console.log('Index exists:', indexExists)

  // // Get index information
  // if (indexExists) {
  //   const indexInfo = await provider.getIndexInfo(storeName, indexName)
  //   console.log('Index info:', indexInfo)
  // }

  // // Clean up (be careful with these operations!)
  // console.log('Cleaning up...')
  // await provider.deleteIndex(storeName, indexName)
  // console.log('Index deleted')

  // await provider.deleteStore(storeName)
  // console.log('Store deleted')
}
