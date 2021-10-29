import getSelector from './getSelector'
import {Collection, DeleteOne} from '../../types'

export default <DocumentType>(collection: Collection) => {
  const func: DeleteOne<DocumentType> = async function (selectorArg, options) {
    const selector = getSelector(arguments)
    const result = await collection.rawCollection.deleteOne(selector, options)

    return result
  }

  return func
}
