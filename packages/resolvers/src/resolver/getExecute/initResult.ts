import isArray from 'lodash/isArray'
import isNil from 'lodash/isNil'
import {ResolverOptions} from '../types'

export default function (options: ResolverOptions, result: any) {
  let {returns} = options

  if (returns) {
    if (isArray(returns) && returns[0].__isModel) {
      if (isNil(result)) {
        return result
      } else if (isArray(result)) {
        return result.map(item => returns[0].initItem(item))
      } else {
        console.warn(`A resolver did not return an array when it should. Result:`, result)
        return result
      }
    } else if (returns.__isModel) {
      return returns.initItem(result)
    } else {
      return result
    }
  } else {
    return result
  }
}
