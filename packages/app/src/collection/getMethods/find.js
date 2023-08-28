import getSelector from './getSelector'

export default ({rawCollection, initItem}) =>
  function find(...args) {
    const options = args[1]
    const selector = getSelector(args)
    const rawCursor = rawCollection.find(selector, options)

    const cursor = {
      rawCursor,
      setReadPreference(...args) {
        cursor.rawCursor.setReadPreference(...args)
        return cursor
      },
      sort(...args) {
        cursor.rawCursor.sort(...args)
        return cursor
      },
      project(...args) {
        cursor.rawCursor.project(...args)
        return cursor
      },
      limit(...args) {
        cursor.rawCursor.limit(...args)
        return cursor
      },
      skip(...args) {
        cursor.rawCursor.skip(...args)
        return cursor
      },
      async count() {
        return await rawCollection.countDocuments(selector)
      },
      async estimatedCount() {
        return await rawCollection.estimatedDocumentCount(selector)
      },
      async toArray() {
        const items = await cursor.rawCursor.toArray()
        return items.map(item => initItem(item))
      }
    }

    return cursor
  }
