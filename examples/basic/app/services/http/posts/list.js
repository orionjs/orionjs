import {route} from '@orion-js/app'
import list from 'app/controllers/Posts/list'

export default route('/posts', async function({viewer}) {
  return list(viewer)
})
