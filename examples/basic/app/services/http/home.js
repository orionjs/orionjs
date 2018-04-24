import {route} from '@orion-js/app'
import registerView from 'app/controllers/Views/registerView'
import getViews from 'app/controllers/Views/getViews'

export default route('/', async function() {
  registerView()
  return await getViews()
})
