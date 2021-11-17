import {Model} from '@orion-js/models'
import {resolver} from '@orion-js/resolvers'
import createSession from '../helpers/createSession'
import {DateTime} from 'luxon'
import {Collection} from '@orion-js/mongodb'

export default ({Users, Session}: {Users: Collection; Session: Model}) =>
  resolver({
    params: {
      token: {
        type: String,
        label: 'Token',
        async custom(token) {
          const maxDate = DateTime.local().minus({weeks: 2}).toJSDate()
          const exists = await Users.find({
            'services.emailVerify.token': token,
            'services.emailVerify.date': {$gte: maxDate}
          }).count()
          if (!exists) return 'tokenNotFound'
        }
      }
    },
    returns: Session,
    mutation: true,
    resolve: async function ({token}, viewer) {
      const user = await Users.findOne({'services.emailVerify.token': token})
      const {email} = user.services.emailVerify

      await Users.updateOne(
        {_id: user._id, 'emails.address': email},
        {
          $set: {'emails.$.verified': true},
          $unset: {'services.emailVerify': ''}
        }
      )
      return await createSession(user, viewer)
    }
  })
