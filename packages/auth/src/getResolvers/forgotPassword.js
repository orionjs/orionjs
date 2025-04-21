import { resolver, generateId, config } from '@orion-js/app'
import findUserByEmail from '../helpers/findUserByEmail'

export default ({ Users, Session, Sessions, sendForgotPasswordToken }) =>
  resolver({
    params: {
      email: {
        type: 'email',
        label: 'Email',
        async custom(email) {
          const user = await findUserByEmail({ email, Users })
          if (!user) {
            return 'userNotFound'
          }
        }
      }
    },
    returns: Boolean,
    mutation: true,
    resolve: async ({ email }) => {
      const { logger } = config()
      logger.info('Using orionjs/auth deprecated method', { method: 'forgotPassword', email })
      const user = await findUserByEmail({ email, Users })
      const token = generateId() + generateId()
      const date = new Date()

      await Users.update(user._id, { $set: { 'services.forgot': { token, date } } })
      if (sendForgotPasswordToken) {
        await sendForgotPasswordToken(user, token)
      }
      return true
    }
  })
