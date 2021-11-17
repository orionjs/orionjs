import {setGetViewer} from '@orion-js/http'
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
import {Resolver} from '@orion-js/resolvers'
import {GetAuthResolversOpts} from '..'
import {Collection} from '@orion-js/mongodb'
import {Model} from '@orion-js/models'

export interface ExtendedGetResolversOpts extends GetAuthResolversOpts {
  Sessions: Collection
  Session: Model
}

export default function (opts: GetAuthResolversOpts) {
  const options = opts as ExtendedGetResolversOpts
  options.Sessions = Sessions(options)
  options.Session = options.customSessionModel || options.Sessions.model
  setOptions(options)

  setGetViewer(getSession)

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

  const resolvers: {[key: string]: Resolver} = {
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
