import {Model} from '@orion-js/app'

export default new Model({
  name: 'UserEmail',
  schema: {
    address: {
      type: 'email'
    },
    verified: {
      type: Boolean
    }
  }
})
