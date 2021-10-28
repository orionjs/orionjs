import getSelector from './getSelector'
import {OrionCollection} from '../Types'

export default (collection: OrionCollection.Collection) => {
  const func: OrionCollection.DeleteOne = async (selectorArg, options) => {
    const selector = getSelector(selectorArg)
    const result = await collection.rawCollection.deleteOne(selector, options)

    return result
  }

  return func
}
