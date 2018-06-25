import {resolver} from '@orion-js/app'
import {deleteUserCard} from '../stripe'

export default ({Users}) =>
  resolver({
    params: {
      cardId: {type: String}
    },
    returns: Users.model,
    mutation: true,
    requireUserId: true,
    async resolve({cardId}, viewer) {
      const user = await Users.findOne(viewer.userId)
      await deleteUserCard(user, cardId)
      return user
    }
  })
