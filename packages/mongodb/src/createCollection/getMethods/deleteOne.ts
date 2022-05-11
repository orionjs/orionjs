import getSelector from './getSelector'
import {Collection, DeleteOne} from '../../types'

export default <DocumentType>(collection: Partial<Collection>) => {
  const func: DeleteOne<DocumentType> = async function (selectorArg, options) {
    await collection.connectionPromise
    const selector = getSelector(arguments)
    const result = await collection.rawCollection.deleteOne(selector, options)

    return result
  }

  return func
}
