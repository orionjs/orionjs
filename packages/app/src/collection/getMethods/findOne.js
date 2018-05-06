import getSelector from './getSelector'

export default ({getRawCollection, model}) =>
  async function findOne(...args) {
    const options = args[1]
    const selector = getSelector(args)
    const rawCollection = getRawCollection()

    const item = await rawCollection.findOne(selector, options)
    if (!item) return item
    return model.initItem(item)
  }
