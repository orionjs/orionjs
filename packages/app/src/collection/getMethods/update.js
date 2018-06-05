import getSelector from './getSelector'
import validateModifier from './validateModifier'
import cleanModifier from './cleanModifier'

export default ({rawCollection, schema}) =>
  async function update(...args) {
    const selector = getSelector(args)
    let modifier = args[1]
    const options = args[2] || {}

    if (!modifier) {
      throw new Error('Modifier is required when making an update')
    }

    if (schema) {
      modifier = options.clean !== false ? await cleanModifier(schema, modifier) : modifier
      if (options.validate !== false) await validateModifier(schema, modifier)
    }

    const result = await rawCollection.update(selector, modifier, options)
    return result.result.nModified
  }
