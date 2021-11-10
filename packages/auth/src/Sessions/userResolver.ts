import {modelResolver} from '@orion-js/resolvers'

export default ({Users}) =>
  modelResolver({
    returns: Users.model,
    resolve: async function (session) {
      const user = await Users.findOne(session.userId)
      return user
    }
  })
