import { resolver, config } from '@orion-js/app'
import generateVerifyEmailToken from '../helpers/generateVerifyEmailToken'

export default ({ Users, sendEmailVerificationToken }) =>
  resolver({
    returns: Boolean,
    mutation: true,
    async resolve(params, viewer) {
      const { logger } = config()
      logger.info('Using orionjs/auth deprecated method', { method: 'sendVerificationEmail', viewer, params })
      const user = await Users.findOne(viewer.userId)
      const token = await generateVerifyEmailToken(user)
      await sendEmailVerificationToken(user, token)
      return true
    }
  })
