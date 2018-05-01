import {Controller} from '@orion-js/app'
import me from './me'

export default new Controller({
  name: 'Users',
  resolvers: {
    me
  }
})
