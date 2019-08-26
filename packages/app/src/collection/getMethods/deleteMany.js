import getSelector from './getSelector'
import runHooks from './runHooks'

export default ({rawCollection, collection}) =>
  async function remove(...args) {
    const selector = getSelector(args)
    // eslint-disable-next-line
    let [_, options, ...otherArgs] = args
    if (!options) options = {}

    await runHooks(collection, 'before.remove', selector, options, ...otherArgs)

    const result = await rawCollection.deleteMany(selector, options)
    await runHooks(collection, 'after.remove', selector, options, ...otherArgs)

    return result.result
  }
