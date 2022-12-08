import getSelector from './getSelector'
import validateUpsert from './validateModifier/validateUpsert'
import cleanModifier from './cleanModifier'
import {Collection, ModelClassBase, Upsert} from '../../types'
import {wrapErrors} from './wrapErrors'

export default <DocumentType extends ModelClassBase>(
  collection: Partial<Collection<DocumentType>>
) => {
  const upsert: Upsert<DocumentType> = async function (selectorArg, modifierArg, options = {}) {
    await collection.connectionPromise
    let modifier = modifierArg as any
    let selector = getSelector(arguments)

    modifier.$setOnInsert = {...modifier.$setOnInsert, _id: collection.generateId()}

    if (collection.schema) {
      const schema = collection.getSchema()

      if (options.clean !== false) {
        selector = (await cleanModifier(schema, {$set: selector})).$set
        modifier = await cleanModifier(schema, modifier, {isUpsert: true})
      }
      if (options.validate !== false) await validateUpsert(schema, selector, modifier)
    }

    const result = await wrapErrors(() => {
      return collection.rawCollection.updateOne(selector, modifier, {upsert: true})
    })

    return result
  }

  return upsert
}
