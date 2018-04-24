import Views from 'app/collections/Views'

export default async function(viewer) {
  await Views.insert({date: new Date()})
}
