import getSelector from './getSelector'

export default ({initItem, rawCollection, model}) =>
  async function findOne(...args) {
    const options = args[1]
    const selector = getSelector(args)

    const item = await rawCollection.findOne(selector, options)
    if (!item) return item
    return initItem(item)
  }
