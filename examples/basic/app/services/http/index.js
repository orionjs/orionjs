import {register, http} from '@orion-js/app'
import routes from './routes'

register({
  service: 'http',
  type: http,
  routes
})
