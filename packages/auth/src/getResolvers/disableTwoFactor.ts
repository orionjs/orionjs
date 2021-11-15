import {Collection} from '@orion-js/mongodb'
import {resolver} from '@orion-js/resolvers'

export default ({Users}: {Users: Collection}) =>
  resolver({
    returns: Users.model,
    mutation: true,
    permissionsOptions: {
      requireUserId: true,
      requireTwoFactor: true
    },
    resolve: async function ({code}, viewer) {
      const user = await Users.findOne(viewer.userId)
      if (!user) throw new Error('User not found')
      if (!(await user.hasTwoFactor())) {
        throw new Error('User does not have two factor')
      }

      await Users.updateOne(user._id, {$unset: {'services.twoFactor': ''}})

      return await Users.findOne(viewer.userId)
    }
  })
