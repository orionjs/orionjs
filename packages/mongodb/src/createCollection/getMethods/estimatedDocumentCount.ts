import getSelector from './getSelector'
import {Collection, CountDocuments, DeleteOne, EstimatedDocumentCount} from '../../types'

export default <DocumentType>(collection: Partial<Collection>) => {
  const func: EstimatedDocumentCount<DocumentType> = async function (options) {
    await collection.connectionPromise
    const result = await collection.rawCollection.estimatedDocumentCount(options)
    return result
  }

  return func
}
