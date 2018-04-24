import Views from 'app/collections/Views'

export default async function(viewer) {
  return await Views.find().toArray()
}
