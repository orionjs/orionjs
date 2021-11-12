import getSelector from './getSelector'
import validateUpsert from './validateModifier/validateUpsert'
import cleanModifier from './cleanModifier'
import {Collection, Upsert} from '../../types'

export default <DocumentType>(collection: Partial<Collection>) => {
  const upsert: Upsert<DocumentType> = async function (selectorArg, modifierArg, options = {}) {
    let modifier = modifierArg as any
    let selector = getSelector(arguments)

    modifier.$setOnInsert = {...modifier.$setOnInsert, _id: collection.generateId()}

    if (collection.model) {
      const schema = collection.getSchema()

      if (options.clean !== false) {
        selector = (await cleanModifier(schema, {$set: selector})).$set
        modifier = await cleanModifier(schema, modifier, {isUpsert: true})
      }
      if (options.validate !== false) await validateUpsert(schema, selector, modifier)
    }

    const result = await collection.rawCollection.updateOne(selector, modifier, {upsert: true})

    return result
  }

  return upsert
}
