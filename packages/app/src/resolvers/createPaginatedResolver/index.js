import resolver from '../resolver'
import getModel from './getModel'
import getParams from './params'
import setOptions from './setOptions'

export default function({returns, collection, params, getCursor}) {
  const getPaginatedCursor = async (params, viewer) => {
    if (getCursor) {
      return await getCursor(params, viewer)
    }
    return collection.find({})
  }

  return resolver({
    params: getParams({returns, collection, params}),
    returns: getModel({returns, collection}),
    async resolve(params, viewer) {
      const cursor = await getPaginatedCursor(params, viewer)

      const options = setOptions(params, cursor)

      return {
        cursor,
        params,
        viewer,
        options
      }
    }
  })
}
