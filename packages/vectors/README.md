# @orion-js/vectors

The `@orion-js/vectors` module provides a provider-agnostic interface for vector storage and similarity search, with built-in support for local file-system storage and AWS S3 Vectors.

## Features

- **Provider-agnostic Interface**: `VectorStorageProvider` defines a standard interface for all vector storage operations.
- **Local Provider**: A file-system-based `LocalVectorProvider` for development, testing, and small-scale deployments.
- **AWS S3 Provider**: An `S3VectorProvider` that integrates with AWS S3 Vectors, a new feature for storing and querying vector embeddings in S3.
- **Type Safety**: Full TypeScript support with comprehensive type definitions for vector stores, indexes, and operations.
- **Core Functionality**:
    - `defineVectorStore`: Idempotently create stores (buckets) and indexes.
    - `insertVectors`, `queryVectors`, `deleteVectors`: Full CRUD and search capabilities.
    - `cosine` and `euclidean` distance metrics.
    - Metadata filtering in queries.

## Installation

```bash
pnpm add @orion-js/vectors
pnpm add @aws-sdk/client-s3vectors # If using S3VectorProvider
```

## Usage

### 1. Define a Vector Store

First, define your vector store configuration. This is where your vectors will be stored.

```typescript
import { VectorStoreConfig } from '@orion-js/vectors'

const storeConfig: VectorStoreConfig = {
  storeName: 'media-embeddings',
  indexes: [
    {
      name: 'movies',
      dimension: 1024, // Dimension of your vectors
      distanceMetric: 'cosine', // 'cosine' or 'euclidean'
      nonFilterableMetadataKeys: ['source_text'] // Optional
    }
  ]
}
```

### 2. Choose a Provider

#### LocalVectorProvider (for development/testing)

This provider stores data on the local file system, which is great for getting started without needing cloud resources.

```typescript
import { LocalVectorProvider } from '@orion-js/vectors'

const provider = new LocalVectorProvider({ basePath: './vector-data' })

// This will create the necessary directories and files
await provider.defineVectorStore(storeConfig)
```

#### S3VectorProvider (for production)

This provider uses AWS S3 Vectors.

> **Note**: S3 Vectors is currently in preview.

```typescript
import { S3VectorProvider } from '@orion-js/vectors'

const provider = new S3VectorProvider({
  region: 'us-east-1',
  // Credentials can be omitted if using IAM roles
})

// This will create an S3 Vector Bucket and Index
await provider.defineVectorStore(storeConfig)
```

### 3. Perform Vector Operations

The API is the same for all providers.

```typescript
// Insert vectors
await provider.insertVectors('media-embeddings', 'movies', [
  {
    key: 'Star Wars',
    data: { float32: embedding1 },
    metadata: { genre: 'scifi', source_text: 'A long time ago...' }
  },
  {
    key: 'Jurassic Park',
    data: { float32: embedding2 },
    metadata: { genre: 'scifi', source_text: 'An adventure 65 million years in the making.' }
  }
])

// Query for similar vectors
const results = await provider.queryVectors('media-embeddings', 'movies', {
  queryVector: { float32: queryEmbedding },
  topK: 3,
  filter: { genre: 'scifi' }, // Filter by metadata
  returnDistance: true,
  returnMetadata: true
})

console.log(results)
```

## Testing

The package includes a comprehensive test suite. The `LocalVectorProvider` is fully tested.

To run the tests:

```bash
pnpm --filter @orion-js/vectors test
```

To run integration tests for `S3VectorProvider`, you need to have AWS credentials configured in your environment. 