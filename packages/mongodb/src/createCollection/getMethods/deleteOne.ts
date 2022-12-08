import getSelector from './getSelector'
import {Collection, DeleteOne, ModelClassBase} from '../../types'

export default function <DocumentType extends ModelClassBase>(
  collection: Partial<Collection<DocumentType>>
) {
  const func: DeleteOne<DocumentType> = async function (selectorArg, options) {
    await collection.connectionPromise
    const selector = getSelector(arguments)
    const result = await collection.rawCollection.deleteOne(selector, options)

    return result
  }

  return func
}
