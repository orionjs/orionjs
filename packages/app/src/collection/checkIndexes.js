import config from '../config'

function matchingDefinition(defIndex, curIndex) {
  if (defIndex.options && defIndex.options.name === curIndex.name) return true
  const defIndexName = Object.keys(defIndex.keys)
    .map(key => `${key}_${defIndex.keys[key]}`)
    .join('_')
  return defIndexName === curIndex.name
}

export default async function checkIndexes(collection) {
  if (collection.hasCustomConnection) return
  const {logger} = config()
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
    logger.error(
      `${indexesToDelete.length} unexpected indexes found in collection "${
        collection.name
      }": ${indexesToDelete
        .map(i => i.name)
        .join(', ')} | Delete the index or fix the collection definition`
    )
  }
}
