import {Controller, setGetViewer, setCorsOptions} from '@orion-js/app'
import loginWithPassword from './loginWithPassword'
import logout from './logout'
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

  setCorsOptions({
    allowHeaders: [
      'X-Requested-With',
      'Access-Control-Allow-Origin',
      'X-HTTP-Method-Override',
      'Content-Type',
      'Authorization',
      'Accept',
      'x-orion-nonce',
      'x-orion-publickey',
      'x-orion-signature'
    ]
  })

  return new Controller({
    name: 'Authentication',
    resolvers: {
      loginWithPassword: loginWithPassword(options),
      logout: logout(options),
      getUserByID: getUserByID(options),
      getUserByEmail: getUserByEmail(options),
      createUser: createUser(options),
      changePassword: changePassword(options)
    }
  })
}
