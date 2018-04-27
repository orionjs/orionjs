import 'babel-core/register'
import 'babel-polyfill'
import './database/connect'
import start from './start'
import register from './register'
import route from './route'
import Collection from './collection'
import OrionError from './OrionError'
import Model from './Model'
import {startGraphQL} from './graphql'
import {resolver, Controller} from './controllers'
import * as GraphQL from 'graphql'

export {
  start,
  register,
  route,
  Collection,
  OrionError,
  Model,
  startGraphQL,
  resolver,
  GraphQL,
  Controller
}
