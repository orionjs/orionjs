import ConfigurationError from '../../../lib/Errors/ConfigurationError'
import isPlainObject from 'lodash/isPlainObject'

export default function({name, params, returns, mutation, resolve, checkPermission}) {
  if (!name) {
    throw new ConfigurationError('Resolver name is required')
  }

  if (!resolve || typeof resolve !== 'function') {
    throw new ConfigurationError('Resolver resolve function is required for ' + name)
  }

  if (params) {
    if (!isPlainObject(params)) {
      throw new ConfigurationError('Params must be a plain object schema for ' + name)
    }
  }

  if (checkPermission) {
    if (typeof checkPermission !== 'function') {
      throw new ConfigurationError('checkPermission must be a function for ' + name)
    }
  }
}
