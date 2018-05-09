import 'babel-core/register'
import 'babel-polyfill'
import './database/connect'
import start from './start'
import register from './register'
import route from './route'
import Collection from './collection'
import generateId from './collection/generateId'
import UserError from './Errors/UserError'
import Model from './Model'
import {startGraphQL} from './graphql'
import ExposeSchemaController from './graphql/ExposeSchemaController'
import {resolver, Controller} from './controllers'
import createPaginatedResolver from './controllers/resolver/createPaginatedResolver'
import createCrudController from './controllers/createCrudController'
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
  Controller,
  createCrudController,
  generateId,
  setGetViewer,
  getCorsOptions,
  setCorsOptions,
  ExposeSchemaController,
  createPaginatedResolver
}
