import getSelector from './getSelector'
import validateModifier from './validateModifier'
import cleanModifier from './cleanModifier'
import {Collection, FindOneAndUpdate, ModelClassBase} from '../../types'

export default <DocumentType extends ModelClassBase>(
  collection: Partial<Collection<DocumentType>>
) => {
  const findOneAndUpdate: FindOneAndUpdate<DocumentType> = async function (
    selectorArg,
    modifierArg,
    options = {}
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

    const result = await collection.rawCollection.findOneAndUpdate(
      selector,
      modifier,
      options.mongoOptions
    )
    if (!result || !result.value) return null
    return collection.initItem(result.value)
  }

  return findOneAndUpdate
}
