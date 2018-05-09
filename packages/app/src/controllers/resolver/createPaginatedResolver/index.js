import resolver from '../index'
import getModel from './getModel'
import params from './params'
import getOptions from './getOptions'

export default function({name, returns, collection}) {
  const getCursor = ({options}) => collection.find({}, options)

  return resolver({
    name,
    params: params({name, returns, collection}),
    returns: getModel({name, returns, collection}),
    async resolve(params, viewer) {
      const options = getOptions(params)
      const cursor = getCursor({params, options, viewer})
      return {
        cursor,
        params,
        viewer,
        options
      }
    }
  })
}
