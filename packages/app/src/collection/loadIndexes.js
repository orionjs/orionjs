import config from '../config'

export default async function loadIndexes(collection) {
  if (!collection.indexes) return
  for (const {keys, options} of collection.indexes) {
    try {
      await collection.rawCollection.createIndex(keys, options)
    } catch (error) {
      const {logger} = config()
      if (error.code === 85) {
        logger.info('Will delete index to create the new version')
        const indexName = error.message.split('name: ')[1].split(' ')[0]
        await collection.rawCollection.dropIndex(indexName)
        logger.info('Index was deleted, creating new index')
        await collection.rawCollection.createIndex(keys, options)
        logger.info('Index updated correctly')
      } else {
        logger.error(`Error creating index for collection ${collection.name}: ${error.message}`)
        logger.error(error)
      }
    }
  }
}
