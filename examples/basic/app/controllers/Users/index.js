import {Controller} from '@orion-js/app'
import me from './me'
import setProfile from './setProfile'

export default new Controller({
  name: 'Users',
  resolvers: {
    me,
    setProfile
  }
})
