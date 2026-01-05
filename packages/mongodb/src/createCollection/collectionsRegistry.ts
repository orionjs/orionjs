import {logger} from '@orion-js/logger'
import type {Collection, ModelClassBase} from '../types'
import {DeleteUnusedIndexesResult} from './deleteUnusedIndexes'

/**
 * Registry that tracks all collections created via createCollection().
 * Maps connection name to a map of collection name to collection instance.
 */
export const collectionsRegistry = new Map<string, Map<string, Collection<ModelClassBase>>>()

/**
 * Registers a collection in the registry.
 * Called automatically when a collection is created via createCollection().
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
  collectionsRegistry.get(connectionName).set(collection.name, collection)
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
