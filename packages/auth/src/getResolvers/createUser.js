import {resolver} from '@orion-js/app'
import hashPassword from '../helpers/hashPassword'
import createSession from '../helpers/createSession'

export default ({Session, Users, Sessions}) => {
  let profile = Users.model.schema.profile || null
  return resolver({
    name: 'createUser',
    params: {
      email: {
        type: 'email',
        label: {
          en: 'Email',
          es: 'Email'
        },
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
        label: {
          en: 'Password',
          es: 'Contraseña'
        }
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
      console.log('a new user was created', JSON.stringify(newUser, null, 2))
      const userId = await Users.insert(newUser)
      const user = await Users.findOne(userId)
      return await createSession({user, Sessions})
    }
  })
}
