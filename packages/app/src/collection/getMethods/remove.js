import getSelector from './getSelector'

export default ({getRawCollection}) =>
  async function remove(...args) {
    const selector = getSelector(args)
    const options = args[1]
    const rawCollection = getRawCollection()
    const result = await rawCollection.remove(selector, options)
    return result
  }
