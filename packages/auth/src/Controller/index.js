import {Controller, setGetViewer} from '@orion-js/app'
import loginWithPassword from './loginWithPassword'
import changePassword from './changePassword'
import getUserByID from './getUserByID'
import getUserByEmail from './getUserByEmail'
import createUser from './createUser'
import Sessions from '../Sessions'
import getSession from './getSession'

export default function(options) {
  options.Sessions = Sessions(options)
  options.Session = options.Sessions.model

  const getViewer = getSession(options)
  setGetViewer(getViewer)

  return new Controller({
    name: 'Authentication',
    resolvers: {
      loginWithPassword: loginWithPassword(options),
      getUserByID: getUserByID(options),
      getUserByEmail: getUserByEmail(options),
      createUser: createUser(options),
      changePassword: changePassword(options)
    }
  })
}
