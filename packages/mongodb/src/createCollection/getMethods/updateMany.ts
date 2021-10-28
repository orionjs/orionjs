import getSelector from './getSelector'
import {OrionCollection} from '../Types'
import cleanModifier from './cleanModifier'
import validateModifier from './validateModifier'

export default <DocumentType>(collection: OrionCollection.Collection) => {
  const updateMany: OrionCollection.UpdateMany<DocumentType> = async (
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

    const result = await collection.rawCollection.updateMany(selector, modifier)

    return result
  }

  return updateMany
}
