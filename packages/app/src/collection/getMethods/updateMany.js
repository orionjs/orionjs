import getSelector from './getSelector'
import validateModifier from './validateModifier'
import cleanModifier from './cleanModifier'
import runHooks from './runHooks'

export default ({rawCollection, schema, collection}) =>
  async function update(...args) {
    const selector = getSelector(args)
    // eslint-disable-next-line
    let [_, modifier, options, ...otherArgs] = args
    if (!options) options = {}

    if (!modifier) {
      throw new Error('Modifier is required when making an update')
    }

    await runHooks(collection, 'before.update', selector, modifier, options, ...otherArgs)

    if (schema) {
      modifier = options.clean !== false ? await cleanModifier(schema, modifier) : modifier
      if (options.validate !== false) await validateModifier(schema, modifier)
    }

    const result = await rawCollection.updateMany(selector, modifier, options)
    await runHooks(collection, 'after.update', selector, modifier, options, ...otherArgs)

    return result.result.nModified
  }
