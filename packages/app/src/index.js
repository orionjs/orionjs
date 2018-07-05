import 'babel-polyfill'
import './Errors/handleErrors'
import './database/connect'
import getServer from './route/start'
import register from './register'
import route from './route'
import Collection from './collection'
import generateId from './collection/getMethods/generateId'
import UserError from './Errors/UserError'
import Model from './Model'
import {resolver, getCrudResolvers, createPaginatedResolver} from './resolvers'
import {setGetViewer} from './route/setGetViewer'
import {getCorsOptions, setCorsOptions} from './route/corsOptions'
import * as GraphQL from 'graphql'
import * as micro from 'micro'

export {
  micro,
  getServer,
  register,
  route,
  Collection,
  UserError,
  Model,
  resolver,
  GraphQL,
  getCrudResolvers,
  generateId,
  setGetViewer,
  getCorsOptions,
  setCorsOptions,
  createPaginatedResolver
}
