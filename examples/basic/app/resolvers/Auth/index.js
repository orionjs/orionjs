import {getAuthResolvers} from '@orion-js/auth'
import Users from 'app/collections/Users'
import sendEmailVerificationToken from './sendEmailVerificationToken'
import sendForgotPasswordToken from './sendForgotPasswordToken'

export default getAuthResolvers({
  Users,
  sendEmailVerificationToken,
  sendForgotPasswordToken
})
