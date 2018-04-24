import Posts from 'app/collections/Posts'

export default async function(viewer, postId) {
  return await Posts.findOne(postId)
}
