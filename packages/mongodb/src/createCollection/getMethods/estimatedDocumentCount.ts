import {Collection, EstimatedDocumentCount, ModelClassBase} from '../../types'

export default <DocumentType extends ModelClassBase>(
  collection: Partial<Collection<DocumentType>>,
) => {
  const func: EstimatedDocumentCount<DocumentType> = async function (options) {
    await collection.connectionPromise
    const result = await collection.rawCollection.estimatedDocumentCount(options)
    return result
  }

  return func
}
