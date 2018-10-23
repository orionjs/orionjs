import {resolver} from '@orion-js/app'
import createSession from '../helpers/createSession'
import {DateTime} from 'luxon'
import hashPassword from '../helpers/hashPassword'

export default ({Users, Session, Sessions}) =>
  resolver({
    name: 'resetPassword',
    params: {
      token: {
        type: String,
        async custom(token) {
          const maxDate = DateTime.local()
            .minus({minutes: 30})
            .toJSDate()
          const exists = await Users.find({
            'services.forgot.token': token,
            'services.forgot.date': {$gte: maxDate}
          }).count()
          if (!exists) return 'tokenNotFound'
        }
      },
      password: {
        type: String,
        min: 8,
        label: 'Password'
      }
    },
    returns: Session,
    mutation: true,
    resolve: async function({token, password}) {
      const user = await Users.findOne({'services.forgot.token': token})

      const modifier = {
        $set: {
          'services.password': {
            bcrypt: hashPassword(password),
            createdAt: new Date()
          }
        },
        $unset: {
          'services.forgot': ''
        }
      }

      if (user.services.password) {
        modifier.$push = {
          'services.oldPasswords': {
            bcrypt: user.services.password.bcrypt,
            changedAt: new Date(),
            forgotten: true
          }
        }
      }

      await Users.update(user._id, modifier)
      return await createSession(user)
    }
  })
