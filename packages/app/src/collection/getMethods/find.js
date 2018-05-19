import getSelector from './getSelector'

export default ({rawCollection, model}) =>
  function find(...args) {
    const options = args[1]
    const selector = getSelector(args)
    const cursor = rawCollection.find(selector, options)

    return {
      cursor,
      sort(...args) {
        return cursor.sort(...args)
      },
      project(...args) {
        return cursor.project(...args)
      },
      limit(...args) {
        return cursor.limit(...args)
      },
      skip(...args) {
        return cursor.skip(...args)
      },
      async count() {
        return await cursor.count()
      },
      async toArray() {
        const items = await cursor.toArray()
        return items.map(item => model.initItem(item))
      }
    }
  }
