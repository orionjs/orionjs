import {resolver} from '@orion-js/app'

export default ({Users}) =>
  resolver({
    name: 'getUserByEmail',
    private: true,
    params: {
      email: {
        type: 'email'
      }
    },
    returns: Users.model,
    mutation: false,
    resolve: async function({email}) {
      if (!email) return null
      email = email.toLowerCase()

      return await Users.findOne({'emails.address': email})
    }
  })
