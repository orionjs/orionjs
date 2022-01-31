import {OrionApolloClientOpts} from './types'

let options: Partial<OrionApolloClientOpts> = {}

export const setOptions = function (newOptions: Partial<OrionApolloClientOpts>) {
  options = newOptions
}

export const getOptions = function () {
  return options
}
