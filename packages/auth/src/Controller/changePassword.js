import {resolver} from '@orion-js/app'
import findUserByEmail from '../helpers/findUserByEmail'
import checkPassword from '../helpers/checkPassword'

export default ({Users, Session}) =>
  resolver({
    name: 'changePassword',
    params: {
      oldPassword: {
        type: String,
        async custom(oldPassword, info, viewer) {
          const user = await Users.findOne(viewer.userId)
          if (!checkPassword(user, oldPassword)) {
            return 'incorrectPassword'
          }
        }
      },
      newPassword: {
        type: String,
        min: 8
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
