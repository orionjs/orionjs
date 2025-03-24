import getSelector from './getSelector'
import validateModifier from './validateModifier'
import cleanModifier from './cleanModifier'
import {Collection, FindOneAndUpdate, ModelClassBase} from '../../types'

export default <DocumentType extends ModelClassBase>(
  collection: Partial<Collection<DocumentType>>,
) => {
  const findOneAndUpdate: FindOneAndUpdate<DocumentType> = async (selector, modifier, options) => {
    await collection.connectionPromise
    const finalSelector = getSelector<DocumentType>([selector])

    if (!modifier) {
      throw new Error('Modifier is required when making an update')
    }

    if (collection.schema) {
      const schema = collection.getSchema()
      modifier = options?.clean !== false ? await cleanModifier(schema, modifier) : modifier
      if (options?.validate !== false) await validateModifier(schema, modifier)
    }

    const result = await collection.rawCollection.findOneAndUpdate(
      finalSelector,
      modifier,
      options?.mongoOptions,
    )

    if (!result) return null
    return result
  }

  return findOneAndUpdate
}
