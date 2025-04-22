import { resolver } from '@orion-js/app'
import getUserCollection from '../helpers/getUserCollection'

export default ({ Users }) => ({
  user: resolver({
    name: 'user',
    returns: Users.model,
    resolve: async function user(session) {
      const UsersCollection = getUserCollection(Users)
      const user = await UsersCollection.findOne(session.userId)
      return user
    }
  })
})
