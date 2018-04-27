import Posts from 'app/collections/Posts'
import {resolver} from '@orion-js/app'
import Post from 'app/models/Post'

export default resolver({
  name: 'post',
  params: {postId: String},
  returns: Post,
  mutation: false,
  resolve: async function({postId}) {
    return await Posts.findOne({postId})
  }
})
