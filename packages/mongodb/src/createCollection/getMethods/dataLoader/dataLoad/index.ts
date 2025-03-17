import {getDataLoader} from './getDataLoader'
import {flatten} from 'rambdax'
import {hashObject} from '@orion-js/helpers'

interface Options {
  loaderKey: any
  load: (values: Array<string>) => Promise<any>
  timeout?: number
  ids?: Array<string>
  id?: string
}

const dataLoad = async (options: Options) => {
  const dataLoader = getDataLoader({
    key: hashObject(options.loaderKey),
    func: options.load,
    timeout: options.timeout || 5,
  })

  if (options.ids) {
    const resultArray = await dataLoader.loadMany(options.ids)
    return flatten(resultArray)
  }

  return await dataLoader.load(options.id)
}

export default dataLoad
