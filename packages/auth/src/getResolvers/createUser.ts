import {resolver} from '@orion-js/resolvers'
import hashPassword from '../helpers/hashPassword'
import createSession from '../helpers/createSession'
import generateVerifyEmailToken from '../helpers/generateVerifyEmailToken'
import {User} from '../types/user'
import {Collection} from '@orion-js/mongodb'

export interface Params<UserType extends User = User> {
  Session: any
  Users: Collection<UserType>
  onCreateUser?: (user: UserType) => Promise<void>
  sendEmailVerificationToken?: (user: UserType, token: string) => Promise<void>
}

export default ({Session, Users, onCreateUser, sendEmailVerificationToken}: Params) => {
  const profile = Users.model.getSchema().profile || null
  return resolver({
    params: {
      email: {
        type: 'email',
        label: 'Email',
        async custom(email) {
          email = email.toLowerCase()
          const count = await Users.find({'emails.address': email}).count()
          if (count) {
            return 'emailExists'
          }
        }
      },
      password: {
        type: String,
        min: 8,
        label: 'Password',
        optional: true
      },
      ...({profile} || {})
    },
    returns: Session,
    mutation: true,
    resolve: async function ({email, password, profile}, viewer) {
      const newUser: Omit<User, '_id'> = {
        emails: [
          {
            address: email.toLowerCase(),
            verified: false
          }
        ],
        services: {},
        profile: profile || {},
        createdAt: new Date()
      }

      if (password) {
        newUser.services.password = {
          bcrypt: hashPassword(password),
          createdAt: new Date()
        }
      }

      const userId = await Users.insertOne(newUser)
      const user = await Users.findOne(userId)
      if (onCreateUser) {
        await onCreateUser(user)
      }

      if (sendEmailVerificationToken) {
        const token = await generateVerifyEmailToken(user, Users)
        await sendEmailVerificationToken(user, token)
      }

      return await createSession(user, viewer)
    }
  })
}
