import getSelector from './getSelector'
import validateModifier from './validateModifier'
import cleanModifier from './cleanModifier'

export default ({getRawCollection, schema}) =>
  async function update(...args) {
    const selector = getSelector(args)
    let doc = args[1]
    const options = args[2] || {}
    const rawCollection = getRawCollection()

    if (schema) {
      doc = options.clean !== false ? await cleanModifier(schema, doc) : doc
      if (options.validate !== false) await validateModifier(schema, doc)
    }

    const result = await rawCollection.update(selector, doc, options)
    return result.result.nModified
  }
