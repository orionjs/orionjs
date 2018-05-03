import {resolver} from '@orion-js/app'
import deleteSession from '../helpers/deleteSession'

export default ({Users, Session, Sessions}) =>
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
    resolve: async function({sessionId}, viewer) {
      if (!sessionId) {
        sessionId = viewer.session._id
      }
      await deleteSession({userId: viewer.userId, Sessions, sessionId})
      return true
    }
  })
