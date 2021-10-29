import getSelector from './getSelector'
import {Collection, DeleteMany} from '../../types'

export default <DocumentType>(collection: Collection) => {
  const func: DeleteMany<DocumentType> = async function (selectorArg, options) {
    const selector = getSelector(arguments)
    const result = await collection.rawCollection.deleteMany(selector, options)

    return result
  }

  return func
}
