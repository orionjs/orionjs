import 'babel-core/register'
import 'babel-polyfill'
import './Errors/handleErrors'
import './database/connect'
import start from './start'
import register from './register'
import route from './route'
import Collection from './collection'
import generateId from './collection/getMethods/generateId'
import UserError from './Errors/UserError'
import Model from './Model'
import {startGraphQL} from './graphql'
import ExposeSchemaResolvers from './graphql/ExposeSchemaResolvers'
import {resolver, getCrudResolvers, createPaginatedResolver} from './resolvers'
import {setGetViewer} from './route/setGetViewer'
import {getCorsOptions, setCorsOptions} from './route/corsOptions'
import * as GraphQL from 'graphql'
export {
  start,
  register,
  route,
  Collection,
  UserError,
  Model,
  startGraphQL,
  resolver,
  GraphQL,
  getCrudResolvers,
  generateId,
  setGetViewer,
  getCorsOptions,
  setCorsOptions,
  ExposeSchemaResolvers,
  createPaginatedResolver
}
