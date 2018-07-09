import ConfigurationError from '../../../lib/Errors/ConfigurationError'
import isPlainObject from 'lodash/isPlainObject'
import isNumber from 'lodash/isNumber'

export default function({cache, params, isPrivate, returns, mutation, resolve, checkPermission}) {
  if (!returns && !isPrivate) {
    throw new ConfigurationError('Resolver returns is undefined')
  }

  if (!resolve || typeof resolve !== 'function') {
    throw new ConfigurationError('Resolver resolve function is required')
  }

  if (params) {
    if (!isPlainObject(params)) {
      throw new ConfigurationError('Params must be a plain object schema')
    }
  }

  if (checkPermission) {
    if (typeof checkPermission !== 'function') {
      throw new ConfigurationError('checkPermission must be a function')
    }
  }

  if (cache) {
    if (!isNumber(cache)) {
      throw new ConfigurationError('cache option must be a number, instead got ' + cache)
    }
  }
}
