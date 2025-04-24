import { resolver } from '@orion-js/app'
import speakeasy from 'speakeasy'

export default ({ Users, Session }) =>
  resolver({
    requireUserId: true,
    params: {
      code: {
        type: String
      }
    },
    returns: Users.model,
    mutation: true,
    resolve: async ({ code }, viewer) => {
      const UsersCollection = getUserCollection(Users)
      const user = await UsersCollection.findOne(viewer.userId)
      if (!user) throw new Error('User not found')

      const verified = speakeasy.totp.verify({
        secret: user.services.twoFactor.base32,
        encoding: 'base32',
        token: code
      })

      if (!verified) {
        throw new Error('The code is not correct')
      }

      await Users.update(user._id, { $set: { 'services.twoFactor.enabled': true } })

      return await UsersCollection.findOne(viewer.userId)
    }
  })
