import 'babel-polyfill'
import './Errors/handleErrors'
import './database/connect'
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
import {resolver, crudResolvers, paginatedResolver} from './resolvers'
import {setGetViewer} from './route/setGetViewer'
import getViewer from './route/handler/getViewer'
import {getCorsOptions, setCorsOptions} from './route/corsOptions'
import * as micro from 'micro'
import cache from './cache'

export {
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
  paginatedResolver
}
