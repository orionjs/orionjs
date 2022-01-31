import {ExtendedGetResolversOpts} from './getResolvers/index'

let options: Partial<ExtendedGetResolversOpts> = {}

export const setOptions = function (newOptions: Partial<ExtendedGetResolversOpts>) {
  options = newOptions
}

export const getOptions = function (): Partial<ExtendedGetResolversOpts> {
  return options
}
