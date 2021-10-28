import getSelector from './getSelector'
import validateUpsert from './validateModifier/validateUpsert'
import cleanModifier from './cleanModifier'
import {generateId} from '@orion-js/helpers'
import {OrionCollection} from '../Types'

export default (collection: OrionCollection.Collection) => {
  const upsert: OrionCollection.Upsert = async (selectorArg, modifier, options = {}) => {
    let selector = getSelector(selectorArg)
    modifier.$setOnInsert = {...modifier.$setOnInsert, _id: generateId()}

    if (collection.model) {
      const schema = collection.model.getSchema()

      if (options.clean !== false) {
        selector = (await cleanModifier(schema, {$set: selector})).$set
        modifier = await cleanModifier(schema, modifier)
      }
      if (options.validate !== false) await validateUpsert(schema, selector, modifier)
    }

    const result = await collection.rawCollection.updateOne(selector, modifier, {upsert: true})

    return result
  }

  return upsert
}
