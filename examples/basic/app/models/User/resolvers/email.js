import {resolver} from '@orion-js/app'

export default resolver({
  name: 'email',
  returns: String,
  resolve: async function(user) {
    return user.emails[0].address
  }
})
