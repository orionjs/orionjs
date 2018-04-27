import Posts from 'app/collections/Posts'
import {resolver} from '@orion-js/app'
import Post from 'app/models/Post'

export default resolver({
  name: 'posts',
  params: {},
  returns: [Post],
  mutation: false,
  resolve: async function() {
    return await Posts.find({}).toArray()
  }
})
