import { resolver, config } from '@orion-js/app'

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
      return await options.Users.findOne(userId)
    }
  })
