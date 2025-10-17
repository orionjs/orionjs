# @orion-js/vectors

## 4.1.4

### Patch Changes

- Updated dependencies [9572f15]
  - @orion-js/logger@4.1.4

## 4.1.3

### Patch Changes

- Updated dependencies [1e33ec4]
  - @orion-js/logger@4.1.3

## 4.1.2

### Patch Changes

- Updated dependencies [c791369]
  - @orion-js/logger@4.1.2

## 4.1.1

### Patch Changes

- Updated dependencies
  - @orion-js/logger@4.1.1

## 4.0.3

### Patch Changes

- Updated dependencies [0aade07]
  - @orion-js/logger@4.0.6

## 4.0.2

### Patch Changes

- Updated dependencies
  - @orion-js/logger@4.0.5

## 4.0.1

### Patch Changes

- new vectors pacakge

## 4.0.0

### Features

- **VectorStorageProvider interface**: Complete interface definition for vector storage operations
- **LocalVectorProvider**: File-system based vector storage for development and testing
- **S3VectorProvider**: AWS S3 Vector storage provider (implementation scaffold ready for AWS SDK)
- **Type definitions**: Comprehensive TypeScript types for all vector operations
- **Vector operations**: Full CRUD operations with similarity search and metadata filtering
- **Distance metrics**: Support for cosine and euclidean distance calculations
- **Comprehensive testing**: Full test suite with integration tests and interface compliance tests
- **Usage examples**: Complete examples showing both providers and various use cases
- **Demo script**: Interactive demo showcasing package functionality

### Provider Features

#### LocalVectorProvider

- File-system based storage using JSON files
- Perfect for development, testing, and small-scale deployments
- Real vector similarity calculations (cosine & euclidean)
- Metadata filtering support
- Full CRUD operations
- Configurable base path for storage location

#### VectorStorageProvider Interface

- `defineVectorStore()` - Setup stores and indexes with validation
- `insertVectors()` / `queryVectors()` - Vector operations with metadata
- `deleteVectors()` - Batch deletion by keys
- `storeExists()` / `indexExists()` - Resource existence checks
- `getIndexInfo()` - Index configuration retrieval
- Store and index management operations

### Technical Details

- **Dimensions**: Support for 1-4096 dimensional vectors
- **Distance Metrics**: Cosine similarity and Euclidean distance
- **Metadata**: Filterable and non-filterable metadata support
- **Validation**: Comprehensive input validation and error handling
- **Type Safety**: Full TypeScript coverage with strict typing
