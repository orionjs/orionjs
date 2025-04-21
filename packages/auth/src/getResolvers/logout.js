import { resolver, config } from '@orion-js/app'
import deleteSession from '../helpers/deleteSession'

export default ({ Users, Session, Sessions }) =>
  resolver({
    name: 'logout',
    params: {
      sessionId: {
        type: 'ID',
        optional: true
      }
    },
    returns: Boolean,
    mutation: true,
    resolve: async ({ sessionId }, viewer) => {
      const { logger } = config()
      logger.info('Using orionjs/auth deprecated method', { method: 'logout', viewer, sessionId })
      if (!viewer.session) return false

      if (!sessionId) {
        sessionId = viewer.session._id
      }
      await deleteSession({ userId: viewer.userId, Sessions, sessionId })
      return true
    }
  })
