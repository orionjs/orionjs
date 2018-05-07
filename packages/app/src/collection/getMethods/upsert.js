import getSelector from './getSelector'
import generateId from './generateId'
import validateUpsert from './validateModifier/validateUpsert'
import cleanModifier from './cleanModifier'

export default ({getRawCollection, schema}) =>
  async function upsert(...args) {
    let selector = getSelector(args)
    let modifier = args[1]
    modifier.$setOnInsert = {...modifier.$setOnInsert, _id: generateId()}
    const options = args[2] || {}

    if (schema) {
      if (options.clean !== false) {
        selector = (await cleanModifier(schema, {$set: selector})).$set
        modifier = await cleanModifier(schema, modifier)
      }
      if (options.validate !== false) await validateUpsert(schema, selector, modifier)
    }

    const rawCollection = getRawCollection()
    const result = await rawCollection.update(selector, modifier, {...options, upsert: true})
    return {
      numberAffected: result.result.nModified,
      insertedId: (result.result.upserted || []).map(item => item._id)[0] || null
    }
  }
