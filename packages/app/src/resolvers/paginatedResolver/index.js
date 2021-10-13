import resolver from '../resolver'
import getModel from './getModel'
import getParams from './params'
import setOptions from './setOptions'
import getArgs from '../resolver/getResolver/getArgs'

export default function ({returns, collection, params, getCursor, ...otherOptions}) {
  const getPaginatedCursor = async (...args) => {
    if (getCursor) {
      return await getCursor(...args)
    }
    return collection.find({})
  }

  return resolver({
    params: getParams({returns, params}),
    returns: getModel({...otherOptions, returns}),
    async resolve(...args) {
      const {callParams: params, viewer} = getArgs(...args)
      const cursor = await getPaginatedCursor(...args)

      /* counting the total number of elements of this cursor, so we make sure
       that it is going to be computed only once */
      const count = await cursor.count()
      const options = setOptions(params, cursor)

      return {
        cursor,
        params,
        viewer,
        options,
        count
      }
    },
    ...otherOptions
  })
}
