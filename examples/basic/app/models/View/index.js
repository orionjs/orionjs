import {Model} from '@orion-js/app'

export default new Model({
  name: 'View',
  schema: {
    _id: {
      type: 'ID'
    },
    date: {
      type: Date
    }
  }
})
