export default function(collection) {
  if (!collection.indexes) return
  for (const {keys, options} of collection.indexes) {
    collection.rawCollection.createIndex(keys, options)
  }
}
