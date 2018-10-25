export default async function(collection) {
  if (!collection.indexes) return
  for (const {keys, options} of collection.indexes) {
    try {
      await collection.rawCollection.createIndex(keys, options)
    } catch (error) {
      if (error.code === 85) {
        console.log('Will delete index to create the new version')
        const indexName = error.message.split('name: ')[1].split(' ')[0]
        await collection.rawCollection.dropIndex(indexName)
        console.log('Index was deleted')
        console.log('Creating new index')
        await collection.rawCollection.createIndex(keys, options)
        console.log('Index updated correctly')
      } else {
        console.error('Error creating index for collection ' + collection.name)
        console.error(error.message)
        console.error(JSON.stringify(error, null, 2))
      }
    }
  }
}
