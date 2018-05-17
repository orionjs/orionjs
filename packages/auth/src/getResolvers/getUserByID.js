import {resolver} from '@orion-js/app'

export default options =>
  resolver({
    name: 'getUserByID',
    private: true,
    params: {
      userId: {
        type: 'ID'
      }
    },
    returns: options.Users.model,
    mutation: false,
    resolve: async function({userId}) {
      return await options.Users.findOne(userId)
    }
  })
