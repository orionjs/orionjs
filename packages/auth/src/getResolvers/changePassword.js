import { resolver, config } from '@orion-js/app'
import checkPassword from '../helpers/checkPassword'
import hashPassword from '../helpers/hashPassword'
import hasPassword from '../helpers/hasPassword'

export default ({ Users, Session }) =>
  resolver({
    name: 'changePassword',
    requireUserId: true,
    params: {
      oldPassword: {
        type: String,
        label: 'Old password',
        async custom(oldPassword, _info, viewer) {
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
        async custom(newPassword, { doc }, _viewer) {
          if (newPassword === doc.oldPassword) {
            return 'samePassword'
          }
        }
      }
    },
    returns: Boolean,
    mutation: true,
    resolve: async function changePassword({ oldPassword, newPassword }, viewer) {
      const { logger } = config()
      logger.info('Using orionjs/auth deprecated method', { method: 'changePassword', viewer })
      await Users.update(viewer.userId, {
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
