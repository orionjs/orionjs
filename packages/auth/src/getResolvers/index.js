import {setGetViewer, setCorsOptions} from '@orion-js/app'
import loginWithPassword from './loginWithPassword'
import logout from './logout'
import changePassword from './changePassword'
import getUserByID from './getUserByID'
import getUserByEmail from './getUserByEmail'
import createUser from './createUser'
import Sessions from '../Sessions'
import getSession from './getSession'
import forgotPassword from './forgotPassword'
import resetPassword from './resetPassword'
import verifyEmail from './verifyEmail'
import generateTwoFactorSecret from './generateTwoFactorSecret'
import activateTwoFactor from './activateTwoFactor'
import addTwoFactorUserResolvers from './addTwoFactorUserResolvers'
import disableTwoFactor from './disableTwoFactor'
import registerCheckers from './registerCheckers'
import {setOptions} from '../optionsStore'
import sendVerificationEmail from './sendVerificationEmail'
import loginWithCode from './loginWithCode'
import requestLoginCode from './requestLoginCode'

export default function(options) {
  options.Sessions = Sessions(options)
  options.Session = options.Sessions.model
  setOptions(options)

  setGetViewer(getSession)

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
      'x-orion-signature',
      'x-orion-locale',
      'x-orion-twofactor'
    ]
  })

  registerCheckers(options)

  let twoFactor = {}
  if (options.twoFactor) {
    addTwoFactorUserResolvers(options)
    twoFactor = {
      generateTwoFactorSecret: generateTwoFactorSecret(options),
      activateTwoFactor: activateTwoFactor(options),
      disableTwoFactor: disableTwoFactor(options)
    }
  }

  const resolvers = {
    loginWithPassword: loginWithPassword(options),
    logout: logout(options),
    getUserByID: getUserByID(options),
    getUserByEmail: getUserByEmail(options),
    createUser: createUser(options),
    sendVerificationEmail: sendVerificationEmail(options),
    changePassword: changePassword(options),
    forgotPassword: forgotPassword(options),
    resetPassword: resetPassword(options),
    verifyEmail: verifyEmail(options),
    ...twoFactor
  }

  if (options.sendLoginCode) {
    resolvers.loginWithCode = loginWithCode(options)
    resolvers.requestLoginCode = requestLoginCode(options)
  }

  return resolvers
}
