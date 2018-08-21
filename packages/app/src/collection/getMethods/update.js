export default ({rawCollection, schema, collection}) =>
  async function update(...args) {
    // eslint-disable-next-line
    let [_, modifier, options, ...otherArgs] = args
    if (!options) options = {}

    if (options.multi) {
      return await collection.updateMany(...args)
    } else {
      return await collection.updateOne(...args)
    }

  }
