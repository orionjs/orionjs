import isArray from 'lodash/isArray'
import isNil from 'lodash/isNil'
import config from '../../../config'

const getModelFromReturns = returns => {
  const baseReturn = isArray(returns) ? returns[0] : returns
  if (baseReturn.__isModel) {
    return baseReturn
  } else if (baseReturn.__model) {
    return baseReturn.__model
  }
  return null
}

export default function ({ returns, result }) {
  const { logger } = config()
  if (returns) {
    const model = getModelFromReturns(returns)
    if (isArray(returns) && typeof model?.initItem === 'function') {
      if (isNil(result)) {
        return result
      } else if (isArray(result)) {
        return result.map(item => model.initItem(item))
      } else {
        logger.warn(`A resolver did not return an array when it should. Result:`, { returns, result })
        return result
      }
    } else if (typeof model?.initItem === 'function') {
      return model.initItem(result)
    } else {
      return result
    }
  } else {
    return result
  }
}
