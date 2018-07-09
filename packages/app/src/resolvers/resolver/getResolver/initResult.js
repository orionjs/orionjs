import isArray from 'lodash/isArray'

export default function({returns, result}) {
  if (returns) {
    if (isArray(returns) && returns[0].__isModel) {
      if (isArray(result)) {
        return result.map(item => returns[0].initItem(item))
      } else {
        console.warn(`A resolver did not return an array when it should`, result)
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
