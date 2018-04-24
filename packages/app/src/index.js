import 'babel-core/register'
import 'babel-polyfill'
import './database/connect'
import start from './start'
import register from './register'
import route from './route'
import Collection from './collection'
import OrionError from './OrionError'
import {validate, ValidationError, getValidationErrors, isValid} from './schema'

export {
  start,
  register,
  route,
  Collection,
  validate,
  OrionError,
  ValidationError,
  getValidationErrors,
  isValid
}
