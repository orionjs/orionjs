import {Collection} from '@orion-js/mongodb'
import {resolver} from '@orion-js/resolvers'
import generateVerifyEmailToken from '../helpers/generateVerifyEmailToken'
import {User} from '../types'

export default ({
  Users,
  sendEmailVerificationToken
}: {
  Users: Collection<User>
  sendEmailVerificationToken?: (user: User, token: string) => Promise<any>
}) =>
  resolver({
    returns: Boolean,
    mutation: true,
    async resolve(params, viewer) {
      const user = await Users.findOne(viewer.userId)
      const token = await generateVerifyEmailToken(user, Users)
      if (sendEmailVerificationToken) {
        await sendEmailVerificationToken(user, token)
      }
      return true
    }
  })
