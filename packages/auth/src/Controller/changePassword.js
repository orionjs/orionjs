import {resolver} from '@orion-js/app'
import findUserByEmail from '../helpers/findUserByEmail'
import checkPassword from '../helpers/checkPassword'

export default ({Users, Session}) =>
  resolver({
    name: 'changePassword',
    params: {
      email: {
        type: 'email',
        async custom(email) {
          const user = await findUserByEmail({email, Users})
          if (!user) {
            return 'userNotFound'
          }
        }
      },
      password: {
        type: String,
        async custom(password, {doc}) {
          const {email} = doc
          const user = await findUserByEmail({email, Users})
          if (!user) {
            return 'userNotFound'
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

      return {
        _id: user._id
      }
    }
  })
