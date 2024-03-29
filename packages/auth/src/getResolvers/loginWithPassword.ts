import {Model} from '@orion-js/models'
import {resolver} from '@orion-js/resolvers'
import findUserByEmail from '../helpers/findUserByEmail'
import checkPassword from '../helpers/checkPassword'
import hasPassword from '../helpers/hasPassword'
import createSession from '../helpers/createSession'
import requireTwoFactor from '../helpers/requireTwoFactor'
import {TwoFactor} from '..'
import {Collection} from '@orion-js/mongodb'

export default ({
  Users,
  Session,
  twoFactor
}: {
  Users: Collection
  Session: Model
  twoFactor?: TwoFactor
}) =>
  resolver({
    params: {
      email: {
        type: 'email',
        label: 'Email',
        async custom(email) {
          const user = await findUserByEmail({email, Users})
          if (!user) {
            return 'userNotFound'
          }
        }
      },
      password: {
        type: String,
        label: 'Password',
        async custom(password, {doc}) {
          const {email} = doc
          const user = await findUserByEmail({email, Users})
          if (!user) {
            return
          }
          if (!hasPassword(user)) {
            return 'noPassword'
          }
          if (!checkPassword(user, password)) {
            return 'incorrectPassword'
          }
        }
      }
    },
    returns: Session,
    mutation: true,
    resolve: async function ({email, password}, viewer) {
      const user = await findUserByEmail({email, Users})
      if (twoFactor) {
        await requireTwoFactor({userId: user._id, twoFactorCode: viewer.twoFactorCode})
      }

      return await createSession(user, viewer)
    }
  })
