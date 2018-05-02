import {Model, resolver} from '@orion-js/app'

const Address = new Model({
  name: 'UserProfileAddress',
  schema: {
    name: {
      type: String
    }
  }
})

export default new Model({
  name: 'UserProfile',
  schema: {
    firstName: {
      type: String,
      optional: true
    },
    addresses: {
      type: [Address],
      optional: true
    }
  },
  resolvers: {
    name: resolver({
      name: 'name',
      returns: String,
      resolve: async function(profile) {
        return profile.firstName
      }
    })
  }
})
