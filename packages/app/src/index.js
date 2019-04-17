import '@babel/polyfill'
import './Errors/handleErrors'
import connect from './database/connect'
import disconnect from './database/disconnect'
import connectToDatabase from './database/connectToDatabase'
import getServer from './route/start'
import register from './register'
import route from './route'
import Collection from './collection'
import generateId from './helpers/generateId'
import hashObject from './helpers/hashObject'
import hook from './collection/hook'
import UserError from './Errors/UserError'
import PermissionsError from './Errors/PermissionsError'
import Model from './Model'
import modelToSchema from './Model/modelToSchema'
import {resolver, crudResolvers, paginatedResolver, addPermissionChecker} from './resolvers'
import checkResolverPermissions from './resolvers/resolver/getResolver/checkPermissions'
import {setGetViewer} from './route/setGetViewer'
import getViewer from './route/handler/getViewer'
import {getCorsOptions, setCorsOptions} from './route/corsOptions'
import * as micro from 'micro'
import cache from './cache'
import sleep from './helpers/sleep'
import {setOnExit, clearOnExit} from './helpers/onExit'

export {
  connectToDatabase,
  setOnExit,
  clearOnExit,
  connect,
  disconnect,
  modelToSchema,
  sleep,
  hashObject,
  cache,
  hook,
  micro,
  getServer,
  register,
  route,
  Collection,
  UserError,
  PermissionsError,
  Model,
  resolver,
  crudResolvers,
  generateId,
  setGetViewer,
  getViewer,
  getCorsOptions,
  setCorsOptions,
  paginatedResolver,
  addPermissionChecker,
  checkResolverPermissions
}
