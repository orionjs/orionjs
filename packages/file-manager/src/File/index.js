import {Model} from '@orion-js/app'
import Files from '../Files'
import pick from 'lodash/pick'
import omit from 'lodash/omit'
import schema from './schema'

export default new Model({
  name: 'File',
  schema,
  resolvers: () => require('./resolvers'),
  // this is only called when its child
  async clean(value, ...args) {
    if (!value) return null
    const fileId = value._id
    const file = await Files.findOne(fileId)
    if (!file) return null
    const keys = Object.keys(omit(schema, 'createdBy', 'createdAt', 'status'))
    const data = pick(file, keys)
    return data
  }
})
