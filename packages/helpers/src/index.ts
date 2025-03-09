import sleep from './sleep'
import hashObject from './hashObject'
import generateId from './generateId'
import createMap from './createMap'
import createMapArray from './createMapArray'

// Import all error-related exports from the Errors module
import {
  OrionError,
  OrionErrorInformation,
  PermissionsError,
  UserError,
  isOrionError,
  isUserError,
  isPermissionsError
} from './Errors'

export * from './composeMiddlewares'
export * from './retries'
export * from './generateUUID'
export * from './normalize'
export * from './searchTokens'
export * from './shortenMongoId'
export {
  // Utility functions
  createMap,
  createMapArray,
  generateId,
  hashObject,
  sleep,

  // Error classes
  OrionError,
  PermissionsError,
  UserError,
  OrionErrorInformation,

  // Error type guards
  isOrionError,
  isUserError,
  isPermissionsError
}
