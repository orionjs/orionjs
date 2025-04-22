import { resolver } from '@orion-js/app'
import getUserCollection from '../helpers/getUserCollection'
export default ({ Users, Session }) =>
  resolver({
    returns: Users.model,
    mutation: true,
    requireUserId: true,
    requireTwoFactor: true,
    resolve: async ({ code }, viewer) => {
      const UsersCollection = getUserCollection(Users)
      const user = await UsersCollection.findOne(viewer.userId)
      if (!user) throw new Error('User not found')
      if (!(await user.hasTwoFactor())) {
        throw new Error('User does not have two factor')
      }

      await Users.update(user._id, { $unset: { 'services.twoFactor': '' } })

      return await UsersCollection.findOne(viewer.userId)
    }
  })
