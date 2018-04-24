import Posts from 'app/collections/Posts'

export default function(viewer, data) {
  Posts.insert({
    title: data.title,
    content: data.content,
    tags: data.tags,
    creatorId: viewer.userId
  })
}
