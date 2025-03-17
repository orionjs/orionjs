import sleep from './sleep'
import hashObject from './hashObject'
import generateId from './generateId'
import createMap from './createMap'
import createMapArray from './createMapArray'

export * from './clone'

// Import all error-related exports from the Errors module
import {
  OrionError,
  PermissionsError,
  UserError,
  isOrionError,
  isUserError,
  isPermissionsError,
} from './Errors'
import type {OrionErrorInformation} from './Errors'

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
  // Error type guards
  isOrionError,
  isUserError,
  isPermissionsError,
}

export type {OrionErrorInformation}
