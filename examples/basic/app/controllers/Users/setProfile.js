import Users from 'app/collections/Users'
import {resolver} from '@orion-js/app'
import User from 'app/models/User'
import UserProfile from 'app/models/User/UserProfile'

export default resolver({
  name: 'setUserProfile',
  params: {
    userId: {
      type: 'ID'
    },
    profile: {
      type: UserProfile
    }
  },
  returns: User,
  requireUserId: true,
  mutation: true,
  checkPermission({userId}, viewer) {
    if (userId !== viewer.userId) {
      return 'userNotAllowed'
    }
  },
  resolve: async function({userId, profile}, viewer) {
    console.log(userId, profile)
    await Users.update(userId, {$set: {profile}})
    return await Users.findOne(userId)
  }
})
