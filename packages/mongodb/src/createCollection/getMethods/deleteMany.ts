import getSelector from './getSelector'
import {OrionCollection} from '../Types'

export default (collection: OrionCollection.Collection) => {
  const func: OrionCollection.DeleteMany = async (selectorArg, options) => {
    const selector = getSelector(selectorArg)
    const result = await collection.rawCollection.deleteMany(selector, options)

    return result
  }

  return func
}
