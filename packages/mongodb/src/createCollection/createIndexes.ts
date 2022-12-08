import {MongoExpiredSessionError} from 'mongodb'
import {Collection, ModelClassBase} from '..'

function matchingDefinition(defIndex, curIndex) {
  if (defIndex.options && defIndex.options.name === curIndex.name) return true
  const defIndexName = Object.keys(defIndex.keys)
    .map(key => `${key}_${defIndex.keys[key]}`)
    .join('_')
  return defIndexName === curIndex.name
}

export async function checkIndexes<DocumentType extends ModelClassBase>(
  collection: Partial<Collection<DocumentType>>
) {
  let currentIndexes = []
  try {
    currentIndexes = await collection.rawCollection.indexes()
  } catch (error) {
    if (error.codeName !== 'NamespaceNotFound') throw error
  }

  const indexesToDelete = collection.indexes
    ? currentIndexes.filter(
        index =>
          index.name !== '_id_' &&
          !collection.indexes.find(definitionIndex => matchingDefinition(definitionIndex, index))
      )
    : currentIndexes

  if (indexesToDelete.length > 0) {
    console.warn(
      `${indexesToDelete.length} unexpected indexes found in collection "${
        collection.name
      }": ${indexesToDelete
        .map(i => i.name)
        .join(', ')} | Delete the index or fix the collection definition`
    )
  }
}
export async function loadIndexes<DocumentType extends ModelClassBase>(
  collection: Partial<Collection<DocumentType>>
): Promise<string[]> {
  if (!collection.indexes) return
  if (!collection.indexes.length) return

  await collection.client.connectionPromise

  const results = Promise.all(
    collection.indexes.map(async ({keys, options}) => {
      try {
        return await collection.rawCollection.createIndex(keys, options)
      } catch (error) {
        if (error.code === 85) {
          console.info('Will delete index to create the new version')
          const indexName = error.message.split('name: ')[1].split(' ')[0]
          await collection.rawCollection.dropIndex(indexName)
          console.info('Index was deleted, creating new index')
          const result = await collection.rawCollection.createIndex(keys, options)
          console.info('Index updated correctly')
          return result
        } else if (error instanceof MongoExpiredSessionError) {
          // this errors is thrown when we are on tests environment
          // but it's not a problem never, index will be created on the next connection
        } else {
          console.error(`Error creating index for collection ${collection.name}: ${error.message}`)
          console.error(error)
          return error.message
        }
      }
    })
  )

  await checkIndexes(collection)

  return results
}
