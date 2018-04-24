import Views from 'app/collections/Views'

export default {
  path: '/',
  run: async function(request) {
    Views.insert({date: new Date()})
    return await Views.find().toArray()
  }
}
