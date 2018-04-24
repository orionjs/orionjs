import Posts from 'app/collections/Posts'

export default async function(viewer, data) {
  return await Posts.insert({
    title: data.title,
    content: data.content,
    creatorId: viewer.userId
  })
}
