import getSelector from './getSelector'
import {OrionCollection} from '../Types'

export default (collection: OrionCollection.Collection) => {
  const updateOne: OrionCollection.UpdateOne = async (selectorArg, modifier, options) => {
    const selector = getSelector(selectorArg)

    if (!modifier) {
      throw new Error('Modifier is required when making an update')
    }

    // if (schema) {
    //   modifier = options.clean !== false ? await cleanModifier(schema, modifier) : modifier
    //   if (options.validate !== false) await validateModifier(schema, modifier)
    // }

    const result = await collection.rawCollection.updateOne(selector, modifier)

    return result
  }

  return updateOne
}
