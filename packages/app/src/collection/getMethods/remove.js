import getSelector from './getSelector'

export default ({rawCollection}) =>
  async function remove(...args) {
    const selector = getSelector(args)
    const options = args[1]
    const result = await rawCollection.remove(selector, options)
    return result.result.ok
  }
