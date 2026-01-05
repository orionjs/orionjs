import {logger} from '@orion-js/logger'
import {Collection, CollectionIndex, ModelClassBase} from '../types'
import {getIndexName} from './getIndexOptions'

/**
 * Represents a MongoDB index as returned by the indexes() method
 */
interface MongoDBIndex {
  key: Record<string, unknown>
  name: string
}

/**
 * Checks if an index definition contains a text index field.
 * Text indexes have the value "text" for their field.
 */
function isTextIndexDefinition(keys: Record<string, unknown>): boolean {
  return Object.values(keys).some(value => value === 'text')
}

/**
 * Checks if a MongoDB index is a text index.
 * Text indexes have special keys _fts and _ftsx.
 */
function isMongoDBTextIndex(key: Record<string, unknown>): boolean {
  return '_fts' in key && '_ftsx' in key
}

/**
 * Generates the expected MongoDB index name from a definition.
 * MongoDB uses the pattern: field1_value1_field2_value2
 */
function generateIndexName(keys: Record<string, unknown>): string {
  return Object.entries(keys)
    .map(([field, value]) => `${field}_${value}`)
    .join('_')
}

/**
 * Compares two index key specifications for equality.
 * Handles key order and special index types (2dsphere, hashed, etc.)
 * Note: Text indexes are handled separately due to their special structure.
 * @param definitionKeys - The keys from the collection index definition
 * @param currentIndexKey - The keys from the current MongoDB index
 * @returns true if the keys match exactly in order and values
 */
export function keysMatch(
  definitionKeys: Record<string, unknown>,
  currentIndexKey: Record<string, unknown>,
): boolean {
  const defEntries = Object.entries(definitionKeys)
  const curEntries = Object.entries(currentIndexKey)

  // Different number of keys means no match
  if (defEntries.length !== curEntries.length) return false

  // Compare each key-value pair in order (order matters for compound indexes)
  for (let i = 0; i < defEntries.length; i++) {
    const [defKey, defValue] = defEntries[i]
    const [curKey, curValue] = curEntries[i]
    if (defKey !== curKey || defValue !== curValue) return false
  }

  return true
}

/**
 * Checks if a current database index matches any of the defined indexes.
 * First checks by custom name if provided (supports both flat and deprecated formats),
 * then by key specification. Handles text indexes specially since MongoDB stores
 * them with different key structure (_fts, _ftsx).
 * @param definedIndexes - Array of index definitions from the collection
 * @param currentIndex - The index from MongoDB to check
 * @returns true if the index is defined in the collection configuration
 */
export function isIndexDefined(
  definedIndexes: CollectionIndex[],
  currentIndex: MongoDBIndex,
): boolean {
  return definedIndexes.some(defIndex => {
    // Match by custom name if provided (handles both flat and deprecated options formats)
    const customName = getIndexName(defIndex)
    if (customName && customName === currentIndex.name) return true

    const defKeys = defIndex.keys as Record<string, unknown>

    // Special handling for text indexes: MongoDB stores them with _fts/_ftsx keys
    // instead of the original field names, so we compare by generated name
    if (isTextIndexDefinition(defKeys) && isMongoDBTextIndex(currentIndex.key)) {
      const expectedName = generateIndexName(defKeys)
      return currentIndex.name === expectedName
    }

    // Match by key specification for regular indexes
    return keysMatch(defKeys, currentIndex.key)
  })
}

/**
 * Result of the deleteUnusedIndexes operation
 */
export interface DeleteUnusedIndexesResult {
  /** Names of the indexes that were deleted */
  deletedIndexes: string[]
  /** Name of the collection that was cleaned */
  collectionName: string
}

/**
 * Deletes indexes that exist in MongoDB but are not defined in the collection configuration.
 * This helps clean up stale indexes that are no longer needed.
 * Always preserves the _id_ index.
 * @param collection - The collection to clean unused indexes from
 * @returns Information about which indexes were deleted
 */
export async function deleteUnusedIndexes<DocumentType extends ModelClassBase>(
  collection: Partial<Collection<DocumentType>>,
): Promise<DeleteUnusedIndexesResult> {
  await collection.connectionPromise

  const result: DeleteUnusedIndexesResult = {
    deletedIndexes: [],
    collectionName: collection.name,
  }

  // Get current indexes from MongoDB
  let currentIndexes: MongoDBIndex[] = []
  try {
    currentIndexes = (await collection.rawCollection.indexes()) as MongoDBIndex[]
  } catch (error) {
    // Collection doesn't exist yet, nothing to delete
    if ((error as {codeName?: string}).codeName === 'NamespaceNotFound') {
      return result
    }
    throw error
  }

  // If no indexes are defined, we don't delete anything (safety measure)
  if (!collection.indexes || collection.indexes.length === 0) {
    return result
  }

  // Find indexes that are not defined in the collection configuration
  const unusedIndexes = currentIndexes.filter(
    index => index.name !== '_id_' && !isIndexDefined(collection.indexes, index),
  )

  // Delete each unused index
  for (const index of unusedIndexes) {
    try {
      await collection.rawCollection.dropIndex(index.name)
      result.deletedIndexes.push(index.name)
      logger.info(`Deleted unused index "${index.name}" from collection "${collection.name}"`)
    } catch (error) {
      logger.error(`Failed to delete index "${index.name}" from collection "${collection.name}"`, {
        error,
      })
    }
  }

  return result
}
