import {route} from '@orion-js/app'
import createPost from 'app/controllers/Posts/create'
import getPost from 'app/controllers/Posts/get'

export default route('/posts/create', async function({viewer, query}) {
  const postId = await createPost(viewer, query)
  return await getPost(viewer, postId)
})
