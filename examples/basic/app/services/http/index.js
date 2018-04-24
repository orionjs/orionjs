import {register, http} from '@orion-js/app'
import hello from './hello'

register({
  service: 'http',
  type: http,
  path: '/hello',
  run: hello
})
