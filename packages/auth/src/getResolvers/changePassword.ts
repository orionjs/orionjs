import {ValidateFunction, ValidationError} from '@orion-js/schema'
import {Collection} from '@orion-js/mongodb'
import {resolver} from '@orion-js/resolvers'
import checkPassword from '../helpers/checkPassword'
import hashPassword from '../helpers/hashPassword'
import hasPassword from '../helpers/hasPassword'

const validateNewPassword: ValidateFunction = async (newPassword, {doc}) => {
  if (newPassword === doc.oldPassword) {
    return 'samePassword'
  }
}

export default ({Users}: {Users: Collection}) =>
  resolver({
    permissionsOptions: {
      requireUserId: true
    },
    params: {
      oldPassword: {
        type: String,
        label: 'Old password'
      },
      newPassword: {
        type: String,
        min: 8,
        label: 'New password',
        validate: validateNewPassword
      }
    },
    returns: Boolean,
    mutation: true,
    resolve: async function ({oldPassword, newPassword}, viewer) {
      const user = await Users.findOne(viewer.userId)
      if (!hasPassword(user)) {
        throw new ValidationError({code: 'noPassword'})
      }
      if (!checkPassword(user, oldPassword)) {
        throw new ValidationError({code: 'incorrectPassword'})
      }

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
