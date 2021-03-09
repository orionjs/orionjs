import isArray from 'lodash/isArray'
import isNil from 'lodash/isNil'
import config from '../../../config'

export default function ({returns, result}) {
  if (returns) {
    if (isArray(returns) && returns[0].__isModel) {
      if (isNil(result)) {
        return result
      } else if (isArray(result)) {
        return result.map(item => returns[0].initItem(item))
      } else {
        const {logger} = config()
        logger.warn(`A resolver did not return an array when it should. Result:`, result)
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
