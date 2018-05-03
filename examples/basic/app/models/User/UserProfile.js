import {Model, resolver} from '@orion-js/app'

export default new Model({
  name: 'UserProfile',
  schema: {
    firstName: {
      type: String,
      min: 3
    },
    lastName: {
      type: String,
      min: 3
    }
  },
  resolvers: {
    name: resolver({
      name: 'name',
      returns: String,
      resolve: async function(profile) {
        console.log(profile)
        return profile.firstName
      }
    })
  }
})
