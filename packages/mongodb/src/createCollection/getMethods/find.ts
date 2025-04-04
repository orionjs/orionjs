import {Collection, Find, ModelClassBase} from '../../types'
import getSelector from './getSelector'
export default function <DocumentType extends ModelClassBase>(
  collection: Partial<Collection<DocumentType>>,
) {
  const find: Find<DocumentType> = (...args: any[]) => {
    const selector = getSelector(args)
    const options = args[1]

    return collection.rawCollection.find(selector, options) as any
  }

  return find
}
