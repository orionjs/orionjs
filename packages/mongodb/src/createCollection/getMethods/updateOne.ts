import getSelector from './getSelector'
import {Collection, UpdateOne} from '../../types'
import cleanModifier from './cleanModifier'
import validateModifier from './validateModifier'

export default <DocumentType>(collection: Collection) => {
  const updateOne: UpdateOne<DocumentType> = async function (
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

    const result = await collection.rawCollection.updateOne(selector, modifier)

    return result
  }

  return updateOne
}
