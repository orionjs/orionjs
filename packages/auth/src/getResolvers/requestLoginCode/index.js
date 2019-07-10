import {resolver} from '@orion-js/app'
import findUserByEmail from '../../helpers/findUserByEmail'
import {DateTime} from 'luxon'
import generateCode from './generateCode'

export default ({Users, sendLoginCode}) =>
  resolver({
    name: 'requestLoginCode',
    params: {
      email: {
        type: 'email',
        label: 'Email',
        async custom(email) {
          const user = await findUserByEmail({email, Users})
          if (!user) {
            return 'userNotFound'
          }

          if (user.services.loginCode) {
            const lastDate = DateTime.fromJSDate(user.services.loginCode.date)

            const date = DateTime.local()
              .minus({seconds: 20})
              .toJSDate()
            if (lastDate > date) {
              return 'mustWaitToRequestLoginCode'
            }
          }
        }
      }
    },
    returns: String,
    mutation: true,
    resolve: async function({email}, viewer) {
      const user = await findUserByEmail({email, Users})
      const {token, code} = await generateCode(user)
      await sendLoginCode({user, email, code}, viewer)
      return token
    }
  })
