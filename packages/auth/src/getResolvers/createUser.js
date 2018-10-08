import {resolver} from '@orion-js/app'
import hashPassword from '../helpers/hashPassword'
import createSession from '../helpers/createSession'
import generateVerifyEmailToken from '../helpers/generateVerifyEmailToken'

export default ({Session, Users, Sessions, onCreateUser, sendEmailVerificationToken}) => {
  let profile = Users.model.schema.profile || null
  return resolver({
    name: 'createUser',
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
        label: 'Password'
      },
      ...({profile} || {})
    },
    returns: Session,
    mutation: true,
    resolve: async function({email, password, profile}) {
      const newUser = {
        emails: [
          {
            address: email.toLowerCase(),
            verified: false
          }
        ],
        services: {
          password: {
            bcrypt: hashPassword(password),
            createdAt: new Date()
          }
        },
        profile: profile || {},
        createdAt: new Date()
      }
      const userId = await Users.insert(newUser)
      const user = await Users.findOne(userId)
      if (onCreateUser) {
        await onCreateUser(user)
      }
      if (sendEmailVerificationToken) {
        const token = await generateVerifyEmailToken(user)
        await sendEmailVerificationToken(user, token)
      }
      return await createSession(user)
    }
  })
}
