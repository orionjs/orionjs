import getSelector from './getSelector'
import validateModifier from './validateModifier'
import cleanModifier from './cleanModifier'
import {OrionCollection} from '../Types'

export default <DocumentType>(collection: OrionCollection.Collection) => {
  const findOneAndUpdate: OrionCollection.FindOneAndUpdate<DocumentType> = async (
    selectorArg,
    modifierArg,
    options = {}
  ) => {
    let modifier = modifierArg as any
    const selector = getSelector(selectorArg)

    if (!modifier) {
      throw new Error('Modifier is required when making an update')
    }

    if (collection.model) {
      const schema = collection.model.getSchema()
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
