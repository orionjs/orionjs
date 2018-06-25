import {resolver} from '@orion-js/app'
import {setDefaultCard} from '../stripe'

export default ({Users}) =>
  resolver({
    params: {
      cardId: {
        type: String
      }
    },
    returns: Users.model,
    mutation: true,
    async resolve({cardId}, viewer) {
      const user = await Users.findOne(viewer.userId)
      await setDefaultCard(user, cardId)
      return user
    }
  })
