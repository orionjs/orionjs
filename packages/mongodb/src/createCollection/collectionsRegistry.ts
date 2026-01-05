import {logger} from '@orion-js/logger'
import type {Collection, CollectionIndex, ModelClassBase} from '../types'
import {DeleteUnusedIndexesResult, keysMatch} from './deleteUnusedIndexes'
import {getIndexName} from './getIndexOptions'
import {createIndexesPromises} from './index'

/**
 * Registry that tracks all collections created via createCollection().
 * Maps connection name to a map of collection name to collection instance.
 * When the same collection is registered multiple times, indexes are merged.
 */
export const collectionsRegistry = new Map<string, Map<string, Collection<ModelClassBase>>>()

/**
 * Checks if two index definitions are equivalent (same keys or same custom name).
 */
function indexesAreEqual(indexA: CollectionIndex, indexB: CollectionIndex): boolean {
  const nameA = getIndexName(indexA)
  const nameB = getIndexName(indexB)

  // If both have custom names, compare by name
  if (nameA && nameB) {
    return nameA === nameB
  }

  // Otherwise compare by keys
  return keysMatch(
    indexA.keys as Record<string, unknown>,
    indexB.keys as Record<string, unknown>,
  )
}

/**
 * Merges two arrays of index definitions, avoiding duplicates.
 * @param existingIndexes - The indexes already registered
 * @param newIndexes - The new indexes to merge in
 * @returns Merged array of unique indexes
 */
function mergeIndexes(
  existingIndexes: CollectionIndex[],
  newIndexes: CollectionIndex[],
): CollectionIndex[] {
  const merged = [...existingIndexes]

  for (const newIndex of newIndexes) {
    const isDuplicate = existingIndexes.some(existing => indexesAreEqual(existing, newIndex))
    if (!isDuplicate) {
      merged.push(newIndex)
    }
  }

  return merged
}

/**
 * Registers a collection in the registry.
 * Called automatically when a collection is created via createCollection().
 * If the same collection name is registered multiple times, indexes are merged
 * to support multiple createCollection() calls for the same collection.
 * @param connectionName - The name of the MongoDB connection
 * @param collection - The collection instance to register
 */
export function registerCollection(
  connectionName: string,
  collection: Collection<ModelClassBase>,
): void {
  if (!collectionsRegistry.has(connectionName)) {
    collectionsRegistry.set(connectionName, new Map())
  }

  const connectionMap = collectionsRegistry.get(connectionName)
  const existingCollection = connectionMap.get(collection.name)

  if (existingCollection) {
    // Merge indexes from multiple createCollection calls for the same collection
    existingCollection.indexes = mergeIndexes(existingCollection.indexes, collection.indexes)
  } else {
    connectionMap.set(collection.name, collection)
  }
}

/**
 * Gets all registered collections for a specific connection.
 * @param connectionName - The name of the MongoDB connection (defaults to 'main')
 * @returns Array of registered collections for the connection
 */
export function getRegisteredCollections(
  connectionName = 'main',
): Array<Collection<ModelClassBase>> {
  const connectionCollections = collectionsRegistry.get(connectionName)
  if (!connectionCollections) {
    return []
  }
  return Array.from(connectionCollections.values())
}

/**
 * Deletes unused indexes from all registered collections for a connection.
 * Iterates over all collections registered via createCollection() and
 * removes indexes that exist in MongoDB but are not defined in the collection configuration.
 *
 * **Important**: This function waits for all pending index creation to complete before
 * deleting any indexes, to avoid race conditions where an index being created might
 * be incorrectly identified as unused.
 *
 * @param connectionName - The name of the MongoDB connection (defaults to 'main')
 * @returns Array of results for each collection that had indexes deleted
 *
 * @example
 * ```ts
 * // Delete unused indexes from all collections on the main connection
 * const results = await deleteAllUnusedIndexes()
 *
 * // Delete unused indexes from all collections on a specific connection
 * const results = await deleteAllUnusedIndexes('secondary')
 *
 * // Log results
 * for (const result of results) {
 *   console.log(`${result.collectionName}: deleted ${result.deletedIndexes.length} indexes`)
 * }
 * ```
 */
export async function deleteAllUnusedIndexes(
  connectionName = 'main',
): Promise<DeleteUnusedIndexesResult[]> {
  const collections = getRegisteredCollections(connectionName)

  if (collections.length === 0) {
    logger.warn(`No collections registered for connection "${connectionName}"`)
    return []
  }

  // Wait for all pending index creation to complete before deleting
  // This prevents race conditions where we might delete an index that's being created
  if (createIndexesPromises.length > 0) {
    logger.info('Waiting for pending index creation to complete before deleting unused indexes...')
    await Promise.all(createIndexesPromises)
  }

  logger.info(
    `Deleting unused indexes from ${collections.length} collections on connection "${connectionName}"`,
  )

  const results: DeleteUnusedIndexesResult[] = []

  for (const collection of collections) {
    const result = await collection.deleteUnusedIndexes()
    if (result.deletedIndexes.length > 0) {
      results.push(result)
    }
  }

  const totalDeleted = results.reduce((sum, r) => sum + r.deletedIndexes.length, 0)
  logger.info(`Deleted ${totalDeleted} unused indexes from ${results.length} collections`)

  return results
}
