import {getDataLoader} from './getDataLoader'
import flatten from 'lodash/flatten'

const dataLoad = async options => {
  const dataLoader = getDataLoader(
    options.loaderKey,
    async keys => {
      return await options.load(keys, options)
    },
    {
      batchScheduleFn: callback => setTimeout(callback, options.timeout || 0)
    }
  )

  if (options.ids) {
    const resultArray = await dataLoader.loadMany(options.ids)
    return flatten(resultArray)
  }

  return await dataLoader.load(options.id)
}

export default function ({collection}) {
  return async options => {
    options.loaderKey = {
      loaderKey: options.loaderKey,
      name: collection.name
    }
    options.collection = collection
    return await dataLoad(options)
  }
}
