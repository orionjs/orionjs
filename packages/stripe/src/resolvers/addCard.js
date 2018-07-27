import {resolver} from '@orion-js/app'
import {createCard} from '../stripe'

export default ({Users}) =>
  resolver({
    params: {
      sourceId: {
        type: String
      }
    },
    returns: Users.model,
    mutation: true,
    requireUserId: true,
    async resolve({sourceId}, viewer) {
      const user = await Users.findOne(viewer.userId)
      await createCard(user, sourceId)

      return user
    }
  })
