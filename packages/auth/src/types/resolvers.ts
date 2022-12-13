import {Model} from '@orion-js/models'
import {Collection} from '@orion-js/mongodb'
import {AbstractSession} from '../Sessions/Model'

export interface TwoFactor {
  issuer: string
}

export interface GetAuthResolversOpts<UserType extends {_id: string} = any> {
  Users: Collection<UserType>
  customSessionModel?: Model
  twoFactor?: TwoFactor
  onCreateUser?: (user: UserType) => any
  sendEmailVerificationToken?: (user: UserType, token: string) => any
  sendForgotPasswordToken?: (user: UserType, token: string) => any
  sendLoginCode?: (
    {user, email, code}: {user: UserType; email: string; code: string},
    viewer: any
  ) => any
  createUserAtLoginWithCode?: (email: string) => any
  omitNonceCheck?: boolean
  onCreateSession?: (session: AbstractSession, viewer: any) => Promise<any>
  customCreateSession?: (user: UserType, viewer: any) => Promise<AbstractSession>
}
