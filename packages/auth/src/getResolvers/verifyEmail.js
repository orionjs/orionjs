import { resolver, config } from '@orion-js/app'
import createSession from '../helpers/createSession'
import { DateTime } from 'luxon'
import getUserCollection from '../helpers/getUserCollection'
export default ({ Users, Session, Sessions }) =>
  resolver({
    params: {
      token: {
        type: String,
        label: 'Token',
        async custom(token) {
          const maxDate = DateTime.local()
            .minus({ weeks: 2 })
            .toJSDate()
          const exists = await Users.find({
            'services.emailVerify.token': token,
            'services.emailVerify.date': { $gte: maxDate }
          }).count()
          if (!exists) return 'tokenNotFound'
        }
      }
    },
    returns: Session,
    mutation: true,
    resolve: async function verifyEmail({ token }, viewer) {
      const { logger } = config()
      logger.info('Using orionjs/auth deprecated method', { method: 'verifyEmail', viewer, token })
      const UsersCollection = getUserCollection(Users)
      const user = await UsersCollection.findOne({ 'services.emailVerify.token': token })
      const { email } = user.services.emailVerify

      await UsersCollection.update(
        { _id: user._id, 'emails.address': email },
        {
          $set: {
            'emails.$.verified': true,
            accountEmail: { address: email, enc_address: email, verified: true }
          },
          $unset: { 'services.emailVerify': '' }
        }
      )

      await UsersCollection.update({ _id: user._id, 'accountEmail.enc_address': email }, {
        $set: {
          'accountEmail.verified': true
        }
      })
      return await createSession(user, viewer)
    }
  })
