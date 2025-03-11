import getSelector from './getSelector'
import {Collection, DeleteMany, ModelClassBase} from '../../types'

export default function <DocumentType extends ModelClassBase>(
  collection: Partial<Collection<DocumentType>>,
) {
  const func: DeleteMany<DocumentType> = async function (selectorArg, options) {
    await collection.connectionPromise
    const selector = getSelector(arguments)
    const result = await collection.rawCollection.deleteMany(selector, options)

    return result
  }

  return func
}
