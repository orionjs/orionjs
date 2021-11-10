import {resolver} from '@orion-js/resolvers'
import deleteSession from '../helpers/deleteSession'

export default ({Users, Session, Sessions}) =>
  resolver({
    params: {
      sessionId: {
        type: 'ID',
        optional: true
      }
    },
    returns: Boolean,
    mutation: true,
    resolve: async function ({sessionId}, viewer) {
      if (!viewer.session) return false

      if (!sessionId) {
        sessionId = viewer.session._id
      }
      await deleteSession({userId: viewer.userId, Sessions, sessionId})
      return true
    }
  })
