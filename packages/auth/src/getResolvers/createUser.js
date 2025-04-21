import { resolver, config } from '@orion-js/app'
import hashPassword from '../helpers/hashPassword'
import createSession from '../helpers/createSession'
import generateVerifyEmailToken from '../helpers/generateVerifyEmailToken'

export default ({ Session, Users, Sessions, onCreateUser, sendEmailVerificationToken }) => {
  const profile = Users.model.schema.profile || null
  return resolver({
    name: 'createUser',
    params: {
      email: {
        type: 'email',
        label: 'Email',
        async custom(email) {
          email = email.toLowerCase()
          const count = await Users.find({ 'emails.address': email }).count()
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
      ...({ profile })
    },
    returns: Session,
    mutation: true,
    resolve: async ({ email, password, profile }, viewer) => {
      const { logger } = config()
      logger.info('Using orionjs/auth deprecated method', { method: 'createUser', viewer, email, profile })
      const newUser = {
        emails: [
          {
            address: email.toLowerCase(),
            verified: false
          }
        ],
        accountEmail: {
          address: email.toLowerCase(),
          enc_address: email.toLowerCase(),
          verified: false
        },
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
      const UsersCollection = Users.encrypted ? Users.encrypted : Users
      const userId = await UsersCollection.insert(newUser)
      const user = await UsersCollection.findOne(userId)
      if (onCreateUser) {
        await onCreateUser(user)
      }

      if (sendEmailVerificationToken) {
        const token = await generateVerifyEmailToken(user)
        await sendEmailVerificationToken(user, token)
      }

      return await createSession(user, viewer)
    }
  })
}
