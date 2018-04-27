import Views from 'app/collections/Views'
import {resolver} from '@orion-js/app'
import View from 'app/models/View'

export default resolver({
  name: 'views',
  params: {},
  returns: [View],
  resolve: async function(post) {
    const views = await Views.find({}, {limit: 1}).toArray()
    return views
  }
})
