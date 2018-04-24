import Posts from 'app/collections/Posts'

export default async function(viewer) {
  return await Posts.find({}).toArray()
}
