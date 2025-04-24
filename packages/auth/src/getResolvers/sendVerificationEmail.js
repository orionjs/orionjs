import { resolver, config } from '@orion-js/app'
import generateVerifyEmailToken from '../helpers/generateVerifyEmailToken'
import getUserCollection from '../helpers/getUserCollection'

export default ({ Users, sendEmailVerificationToken }) =>
  resolver({
    returns: Boolean,
    mutation: true,
    async resolve(params, viewer) {
      const { logger } = config()
      logger.info('Using orionjs/auth deprecated method', { method: 'sendVerificationEmail', viewer, params })
      const UsersCollection = getUserCollection(Users)
      const user = await UsersCollection.findOne(viewer.userId)
      const token = await generateVerifyEmailToken(user)
      await sendEmailVerificationToken(user, token)
      return true
    }
  })
