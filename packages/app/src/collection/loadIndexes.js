import config from '../config'

export default async function loadIndexes(collection) {
  if (!collection.indexes) return
  for (const {keys, options} of collection.indexes) {
    try {
      await collection.rawCollection.createIndex(keys, options)
    } catch (error) {
      const {logger} = config()
      if (error.code === 85 || error.code === 86) {
        try {
          const regex = /name:\s*"?([^",}]+)"?/
          const indexName = error.message.match(regex)[1];
          logger.info('Will delete index to create the new version', {collectionName: collection.name, indexName, error  })
          await collection.rawCollection.dropIndex(indexName)
          logger.info('Index was deleted, creating new index')
          await collection.rawCollection.createIndex(keys, options)
          logger.info('Index updated correctly')
         } catch(error) {
          logger.error(`Error creating re-index for collection ${collection.name}: ${error.message}`, { code: error.code, codeName: error.codeName })
          logger.error(error)
        }
      } else {
        logger.error(`Error creating index for collection ${collection.name}: ${error.message}`, { code: error.code, codeName: error.codeName })
        logger.error(error)
      }
    }
  }
}
