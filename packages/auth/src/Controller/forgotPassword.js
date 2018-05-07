import {resolver, generateId} from '@orion-js/app'
import findUserByEmail from '../helpers/findUserByEmail'

export default ({Users, Session, Sessions}) =>
  resolver({
    name: 'forgotPassword',
    params: {
      email: {
        type: 'email',
        async custom(email) {
          const user = await findUserByEmail({email, Users})
          if (!user) {
            return 'userNotFound'
          }
        }
      }
    },
    returns: Boolean,
    mutation: true,
    resolve: async function({email, password}) {
      const user = await findUserByEmail({email, Users})
      const token = generateId() + generateId()
      const date = new Date()

      Users.update(user._id, {$set: {'services.forgot': {token, date}}})
      return true
    }
  })
