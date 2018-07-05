import {resolver} from '@orion-js/app'
import findUserByEmail from '../helpers/findUserByEmail'
import checkPassword from '../helpers/checkPassword'
import createSession from '../helpers/createSession'

export default ({Users, Session, Sessions}) =>
  resolver({
    name: 'loginWithPassword',
    params: {
      email: {
        type: 'email',
        label: {
          en: 'Email',
          es: 'Email'
        },
        async custom(email) {
          const user = await findUserByEmail({email, Users})
          if (!user) {
            return 'userNotFound'
          }
        }
      },
      password: {
        type: String,
        label: {
          en: 'Password',
          es: 'Contraseña'
        },
        async custom(password, {doc}) {
          const {email} = doc
          const user = await findUserByEmail({email, Users})
          if (!user) {
            return
          }
          if (!checkPassword(user, password)) {
            return 'incorrectPassword'
          }
        }
      }
    },
    returns: Session,
    mutation: true,
    resolve: async function({email, password}) {
      const user = await findUserByEmail({email, Users})
      return await createSession({user, Sessions})
    }
  })
