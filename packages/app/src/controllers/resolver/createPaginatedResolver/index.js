import resolver from '../index'
import getModel from './getModel'
import getParams from './params'
import getOptions from './getOptions'

export default function({name, returns, collection, params, getCursor}) {
  const getPaginatedCursor = async ({params, options}) => {
    if (getCursor) {
      return await getCursor({params, options})
    }
    return collection.find({}, options)
  }

  return resolver({
    name,
    params: getParams({name, returns, collection, params}),
    returns: getModel({name, returns, collection}),
    async resolve(params, viewer) {
      const options = getOptions(params)
      const cursor = await getPaginatedCursor({params, options, viewer})
      return {
        cursor,
        params,
        viewer,
        options
      }
    }
  })
}
