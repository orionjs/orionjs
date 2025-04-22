import { resolver, config } from '@orion-js/app'
import getUserCollection from '../helpers/getUserCollection'

export default options =>
  resolver({
    private: true,
    params: {
      userId: {
        type: 'ID'
      }
    },
    returns: options.Users.model,
    mutation: false,
    resolve: async ({ userId }) => {
      const { logger } = config()
      logger.info('Using orionjs/auth deprecated method', { method: 'getUserByID', userId })
      const UsersCollection = getUserCollection(options.Users)
      return await UsersCollection.findOne(userId)
    }
  })
