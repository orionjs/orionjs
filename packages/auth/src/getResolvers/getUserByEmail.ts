import {resolver} from '@orion-js/resolvers'
import {GetSessionOpts} from '../types'

export default ({Users}: GetSessionOpts) =>
  resolver({
    private: true,
    params: {
      email: {
        type: 'email'
      }
    },
    returns: Users.model,
    mutation: false,
    resolve: async function ({email}) {
      if (!email) return null
      email = email.toLowerCase()

      return await Users.findOne({'emails.address': email})
    }
  })
