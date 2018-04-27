import {Collection} from '@orion-js/app'
import Post from 'app/models/Post'

export default new Collection({
  name: 'posts',
  model: Post
})
