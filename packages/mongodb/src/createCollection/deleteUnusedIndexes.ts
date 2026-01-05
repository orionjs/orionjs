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
 * Compares two index key specifications for equality.
 * Handles key order and special index types (text, 2dsphere, hashed, etc.)
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
 * then by key specification.
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
    // Match by key specification (safer than name comparison)
    return keysMatch(defIndex.keys as Record<string, unknown>, currentIndex.key)
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
