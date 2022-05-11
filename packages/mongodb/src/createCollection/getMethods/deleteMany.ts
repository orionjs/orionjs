import getSelector from './getSelector'
import {Collection, DeleteMany} from '../../types'

export default <DocumentType>(collection: Partial<Collection>) => {
  const func: DeleteMany<DocumentType> = async function (selectorArg, options) {
    await collection.connectionPromise
    const selector = getSelector(arguments)
    const result = await collection.rawCollection.deleteMany(selector, options)

    return result
  }

  return func
}
