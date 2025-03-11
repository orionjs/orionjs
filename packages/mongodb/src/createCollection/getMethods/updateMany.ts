import getSelector from './getSelector'
import {Collection, ModelClassBase, UpdateMany} from '../../types'
import cleanModifier from './cleanModifier'
import validateModifier from './validateModifier'
import {wrapErrors} from './wrapErrors'

export default <DocumentType extends ModelClassBase>(
  collection: Partial<Collection<DocumentType>>,
) => {
  const updateMany: UpdateMany<DocumentType> = async function (
    selectorArg,
    modifierArg,
    options = {},
  ) {
    await collection.connectionPromise
    let modifier = modifierArg as any
    const selector = getSelector(arguments)

    if (!modifier) {
      throw new Error('Modifier is required when making an update')
    }

    if (collection.schema) {
      const schema = collection.getSchema()
      modifier = options.clean !== false ? await cleanModifier(schema, modifier) : modifier
      if (options.validate !== false) await validateModifier(schema, modifier)
    }

    const result = await wrapErrors(() => {
      return collection.rawCollection.updateMany(selector, modifier, options.mongoOptions)
    })

    return result
  }

  return updateMany
}
