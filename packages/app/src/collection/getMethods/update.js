import getSelector from './getSelector'

export default ({getRawCollection}) =>
  async function update(...args) {
    const selector = getSelector(args)
    const doc = args[1]
    const options = args[2]
    const rawCollection = getRawCollection()
    const result = await rawCollection.update(selector, doc, options)
    return result
  }
