import { resolver, config } from '@orion-js/app'
import findUserByEmail from '../../helpers/findUserByEmail'
import createSession from '../../helpers/createSession'
import requireTwoFactor from '../../helpers/requireTwoFactor'
import validate from './validate'
import getUserCollection from '../../helpers/getUserCollection'
export default ({ Users, Session, Sessions, twoFactor }) =>
  resolver({
    name: 'loginWithCode',
    params: {
      email: {
        type: 'email',
        label: 'Email',
        async custom(email) {
          const user = await findUserByEmail({ email, Users })
          if (!user) {
            return 'userNotFound'
          }
        }
      },
      token: {
        type: String,
        label: 'Token'
      },
      code: {
        type: String,
        label: 'Code',
        async clean(code) {
          if (!code) return
          return code.toLowerCase()
        }
      }
    },
    returns: Session,
    mutation: true,
    resolve: async function loginWithCode({ email, code, token }, viewer) {
      const { logger } = config()
      logger.info('Using orionjs/auth deprecated method', { method: 'loginWithCode', viewer, email, code, token })
      const user = await findUserByEmail({ email, Users })

      await validate({ user, code, token })

      const userEmail = user.emails.find(({ address }) => address === email)

      if (!userEmail.verified) {
        const UsersCollection = getUserCollection(Users)
        await UsersCollection.update(
          { _id: user._id, 'emails.address': email },
          {
            $set: {
              'emails.$.verified': true,
              accountEmail: { address: email, enc_address: email, verified: true }
            }
          }
        )
      }

      await user.update({ $unset: { 'services.loginCode': '' } })

      if (twoFactor) {
        await requireTwoFactor({ userId: user._id, twoFactorCode: viewer.twoFactorCode })
      }

      return await createSession(user, viewer)
    }
  })
