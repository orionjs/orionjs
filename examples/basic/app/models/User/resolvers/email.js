import {resolver} from '@orion-js/app'

export default resolver({
  returns: String,
  resolve: async function(user) {
    return user.emails[0].address
  }
})
