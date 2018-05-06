import getSelector from './getSelector'
import generateId from './generateId'

export default ({getRawCollection}) =>
  async function upsert(...args) {
    const selector = getSelector(args)
    const doc = args[1]
    doc.$setOnInsert = {_id: generateId()}
    const rawCollection = getRawCollection()
    const result = await rawCollection.update(selector, doc, {upsert: true})
    return result
  }
