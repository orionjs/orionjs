import {Model} from '@orion-js/app'
import UserProfile from './UserProfile'
import UserEmail from './UserEmail'
import resolvers from './resolvers'

export default new Model({
  name: 'User',
  resolvers,
  schema: {
    _id: {
      type: 'ID'
    },
    emails: {
      type: [UserEmail]
    },
    createdAt: {
      type: Date
    },
    services: {
      type: 'blackbox',
      private: true
    },
    profile: {
      type: UserProfile
    }
  }
})
