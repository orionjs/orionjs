import {Model} from '@orion-js/app'

export default new Model({
  name: 'UserProfile',
  schema: {
    firstName: {
      type: String,
      optional: true
    }
  }
})
