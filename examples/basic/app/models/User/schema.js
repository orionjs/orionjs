import UserProfile from './UserProfile'
import UserEmail from './UserEmail'

export default {
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
  },
  roles: {
    type: ['ID'],
    optional: true
  },
  stripeCustomerId: {
    type: String,
    optional: true,
    private: true
  }
}
