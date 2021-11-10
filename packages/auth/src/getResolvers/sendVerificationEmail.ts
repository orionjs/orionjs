import {resolver} from '@orion-js/resolvers'
import generateVerifyEmailToken from '../helpers/generateVerifyEmailToken'

export default ({Users, sendEmailVerificationToken}) =>
  resolver({
    returns: Boolean,
    mutation: true,
    async resolve(params, viewer) {
      const user = await Users.findOne(viewer.userId)
      const token = await generateVerifyEmailToken(user)
      await sendEmailVerificationToken(user, token)
      return true
    }
  })
