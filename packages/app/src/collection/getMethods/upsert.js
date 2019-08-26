import getSelector from './getSelector'
import generateId from '../../helpers/generateId'
import validateUpsert from './validateModifier/validateUpsert'
import cleanModifier from './cleanModifier'
import runHooks from './runHooks'
import cleanResult from './cleanResult'

export default ({rawCollection, schema, collection}) =>
  async function upsert(...args) {
    let selector = getSelector(args)
    // eslint-disable-next-line
    let [_, modifier, options, ...otherArgs] = args
    if (!options) options = {}

    modifier.$setOnInsert = {...modifier.$setOnInsert, _id: generateId()}

    if (schema) {
      if (options.clean !== false) {
        selector = (await cleanModifier(schema, {$set: selector})).$set
        modifier = await cleanModifier(schema, modifier)
      }
      if (options.validate !== false) await validateUpsert(schema, selector, modifier)
    }

    await runHooks(collection, 'before.upsert', selector, modifier, options, ...otherArgs)
    const result = await rawCollection.updateOne(selector, modifier, {...options, upsert: true})
    await runHooks(collection, 'after.upsert', selector, modifier, options, ...otherArgs)
    return {
      ...cleanResult(result),
      upsertedId: result.upsertedId ? result.upsertedId._id : null
    }
  }
