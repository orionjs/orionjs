import {ExecuteOptions} from '../types'

export default async function (executeOptions: ExecuteOptions) {
  const {parent, params, viewer, info, options} = executeOptions
  const executeResolver = async (): Promise<any> => {
    const resultFunc = options.resolve as (...args: any) => any
    if (parent) {
      return await resultFunc(parent, params, viewer, info)
    }
    return await resultFunc(params, viewer, info)
  }

  return await executeResolver()
}
