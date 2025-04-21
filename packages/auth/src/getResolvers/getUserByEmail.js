import { resolver, config } from '@orion-js/app'

export default ({ Users }) =>
  resolver({
    name: 'getUserByEmail',
    private: true,
    params: {
      email: {
        type: 'email'
      }
    },
    returns: Users.model,
    mutation: false,
    resolve: async ({ email }) => {
      const { logger } = config()
      logger.info('Using orionjs/auth deprecated method', { method: 'getUserByEmail', email })
      if (!email) return null
      email = email.toLowerCase()

      return await Users.findOne({ 'emails.address': email })
    }
  })
