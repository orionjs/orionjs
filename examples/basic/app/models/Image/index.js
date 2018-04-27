import {Model} from '@orion-js/app'

export default new Model({
  name: 'Image',
  schema: {
    url: {
      type: String
    },
    size: {
      type: Number
    },
    caption: {
      type: String
    }
  }
})
