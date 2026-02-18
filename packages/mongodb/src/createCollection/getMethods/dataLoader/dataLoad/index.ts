import {hashObject} from '@orion-js/helpers'
import {getDataLoader} from './getDataLoader'

interface Options {
  loaderKey: any
  load: (values: Array<string>) => Promise<any>
  timeout?: number
  ids?: Array<string>
  id?: string
}

const dataLoad = async (options: Options) => {
  if (options.ids && options.ids.length === 0) {
    return []
  }

  if (!options.ids && typeof options.id === 'undefined') {
    return []
  }

  const dataLoader = getDataLoader({
    key: hashObject(options.loaderKey),
    func: options.load,
    timeout: options.timeout || 5,
  })

  if (options.ids) {
    const resultArray = await dataLoader.loadMany(options.ids)
    return resultArray.flat()
  }

  return await dataLoader.load(options.id)
}

export default dataLoad
