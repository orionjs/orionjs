import getSelector from './getSelector'
import {Collection, UpdateMany} from '../../types'
import cleanModifier from './cleanModifier'
import validateModifier from './validateModifier'

export default <DocumentType>(collection: Collection) => {
  const updateMany: UpdateMany<DocumentType> = async function (
    selectorArg,
    modifierArg,
    options = {}
  ) {
    let modifier = modifierArg as any
    const selector = getSelector(arguments)

    if (!modifier) {
      throw new Error('Modifier is required when making an update')
    }

    if (collection.model) {
      const schema = collection.getSchema()
      modifier = options.clean !== false ? await cleanModifier(schema, modifier) : modifier
      if (options.validate !== false) await validateModifier(schema, modifier)
    }

    const result = await collection.rawCollection.updateMany(selector, modifier)

    return result
  }

  return updateMany
}
