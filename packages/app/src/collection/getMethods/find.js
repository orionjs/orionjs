import getSelector from './getSelector'

export default ({rawCollection, initItem, odel}) =>
  function find(...args) {
    const options = args[1]
    const selector = getSelector(args)
    const rawCursor = rawCollection.find(selector, options)

    const cursor = {
      rawCursor,
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
        return await cursor.rawCursor.count()
      },
      async toArray() {
        const items = await cursor.rawCursor.toArray()
        return items.map(item => initItem(item))
      }
    }

    return cursor
  }
