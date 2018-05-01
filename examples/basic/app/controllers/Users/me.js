import Users from 'app/collections/Users'
import {resolver} from '@orion-js/app'
import User from 'app/models/User'

export default resolver({
  name: 'me',
  params: {},
  returns: User,
  mutation: false,
  resolve: async function(params, viewer) {
    return await Users.findOne(viewer.userId)
  }
})
