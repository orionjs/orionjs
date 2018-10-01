import {resolver} from '@orion-js/app'
import createSession from '../helpers/createSession'
import {DateTime} from 'luxon'

export default ({Users, Session, Sessions}) =>
  resolver({
    params: {
      token: {
        type: String,
        label: 'Token',
        async custom(token) {
          const maxDate = DateTime.local()
            .minus({minutes: 30})
            .toJSDate()
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
    resolve: async function({token}) {
      const user = await Users.findOne({'services.emailVerify.token': token})
      const {email} = user.services.emailVerify
      console.log(
        {_id: user._id, 'emails.address': email},
        {
          $set: {'emails.$.verified': true},
          $unset: {'services.emailVerify': ''}
        }
      )
      await Users.update(
        {_id: user._id, 'emails.address': email},
        {
          $set: {'emails.$.verified': true},
          $unset: {'services.emailVerify': ''}
        }
      )
      console.log(await Users.findOne(user._id))
      return await createSession({user, Sessions})
    }
  })
