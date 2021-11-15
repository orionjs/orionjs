import {Collection} from '@orion-js/mongodb'
import {resolver} from '@orion-js/resolvers'
import checkPassword from '../helpers/checkPassword'
import hashPassword from '../helpers/hashPassword'
import hasPassword from '../helpers/hasPassword'

export default ({Users}: {Users: Collection}) =>
  resolver({
    permissionsOptions: {
      requireUserId: true
    },
    params: {
      oldPassword: {
        type: String,
        label: 'Old password',
        async custom(oldPassword, info, viewer) {
          const user = await Users.findOne(viewer.userId)
          if (!hasPassword(user)) {
            return 'noPassword'
          }
          if (!checkPassword(user, oldPassword)) {
            return 'incorrectPassword'
          }
        }
      },
      newPassword: {
        type: String,
        min: 8,
        label: 'New password',
        async custom(newPassword, {doc}, viewer) {
          if (newPassword === doc.oldPassword) {
            return 'samePassword'
          }
        }
      }
    },
    returns: Boolean,
    mutation: true,
    resolve: async function ({oldPassword, newPassword}, viewer) {
      await Users.updateOne(viewer.userId, {
        $set: {
          'services.password': {
            bcrypt: hashPassword(newPassword),
            createdAt: new Date()
          }
        },
        $push: {
          'services.oldPasswords': {
            bcrypt: hashPassword(oldPassword),
            changedAt: new Date()
          }
        }
      })
      return true
    }
  })
