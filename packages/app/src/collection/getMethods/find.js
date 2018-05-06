import getSelector from './getSelector'

export default ({getRawCollection, model}) =>
  function find(...args) {
    const options = args[1]
    const selector = getSelector(args)
    const rawCollection = getRawCollection()
    const cursor = rawCollection.find(selector, options)

    return {
      cursor,
      async count() {
        return await cursor.count()
      },
      async toArray() {
        const items = await cursor.toArray()
        return items.map(item => model.initItem(item))
      }
    }
  }
