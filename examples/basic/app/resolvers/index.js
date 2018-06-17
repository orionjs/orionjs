import {ExposeSchemaResolvers} from '@orion-js/app'
import Auth from './Auth'
import Users from './Users'
import FileManager from './FileManager'

export default {
  ...FileManager,
  ...ExposeSchemaResolvers,
  ...Auth,
  ...Users
}
