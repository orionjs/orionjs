import {logger} from '@orion-js/logger'
import {IndexSpecification, MongoExpiredSessionError, MongoNotConnectedError} from 'mongodb'
import {Collection, ModelClassBase} from '..'
import {getMergedIndexes} from './collectionsRegistry'
import {isIndexDefined} from './deleteUnusedIndexes'
import {getIndexOptions} from './getIndexOptions'

export interface MongoDBIndex {
  key: Record<string, unknown>
  name: string
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function createOrReplaceIndex<DocumentType extends ModelClassBase>(
  collection: Partial<Collection<DocumentType>>,
  keys: IndexSpecification,
  options: ReturnType<typeof getIndexOptions>,
): Promise<string> {
  try {
    return await collection.rawCollection.createIndex(keys, options)
  } catch (error) {
    if (error.code !== 85 && error.code !== 86) throw error

    logger.info('Will delete index to create the new version')
    const message = error.errorResponse.errmsg
    const indexName = message.split('name: "')[1].split('"')[0]
    await collection.rawCollection.dropIndex(indexName)
    logger.info('Index was deleted, creating new index')
    const result = await collection.rawCollection.createIndex(keys, options)
    logger.info('Index updated correctly')
    return result
  }
}

/**
 * Checks for indexes in the database that are not defined in the collection configuration.
 * Uses merged indexes from all createCollection() calls for the same collection name.
 * Logs a warning if unexpected indexes are found.
 */
export async function checkIndexes<DocumentType extends ModelClassBase>(
  collection: Partial<Collection<DocumentType>>,
): Promise<void> {
  await collection.connectionPromise

  // Get current indexes from MongoDB
  let currentIndexes: Array<{key: Record<string, unknown>; name: string}> = []
  try {
    currentIndexes = (await collection.rawCollection.indexes()) as MongoDBIndex[]
  } catch (error) {
    if ((error as {codeName?: string}).codeName !== 'NamespaceNotFound') throw error
    return
  }

  // Get merged indexes from all createCollection() calls for this collection
  const mergedIndexes = getMergedIndexes(collection.connectionName, collection.name)

  // If no indexes defined anywhere, skip the check
  if (mergedIndexes.length === 0) {
    return
  }

  // Find unexpected indexes using the merged indexes from the registry
  const unexpectedIndexes = currentIndexes.filter(
    index => index.name !== '_id_' && !isIndexDefined(mergedIndexes, index),
  )

  if (unexpectedIndexes.length > 0) {
    logger.warn(
      `${unexpectedIndexes.length} unexpected indexes found in collection "${
        collection.name
      }": ${unexpectedIndexes
        .map(i => i.name)
        .join(', ')} | Delete the index or fix the collection definition`,
    )
  }
}
export async function loadIndexes<DocumentType extends ModelClassBase>(
  collection: Partial<Collection<DocumentType>>,
): Promise<string[]> {
  if (!collection.indexes) return
  if (!collection.indexes.length) return

  await collection.connectionPromise

  const results = Promise.all(
    collection.indexes.map(async indexDef => {
      const {keys} = indexDef
      // Support both flat options and deprecated nested options
      const options = getIndexOptions(indexDef)

      try {
        return await createOrReplaceIndex(collection, keys, options)
      } catch (error) {
        const message = getErrorMessage(error)
        const willRetry =
          error instanceof MongoExpiredSessionError || error instanceof MongoNotConnectedError

        logger.warn(
          `Failed to create index for collection "${collection.name}". The server will continue${
            willRetry ? ' and the index will be retried on the next connection' : ''
          }`,
          {error, keys},
        )

        return message
      }
    }),
  )

  await checkIndexes(collection)

  return results
}
