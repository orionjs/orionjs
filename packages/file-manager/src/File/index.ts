import {ModelSchema, createModel} from '@orion-js/models'
import {Files} from '../Files'
import pick from 'lodash/pick'
import omit from 'lodash/omit'
import {FileSchema} from './schema'
import {getModelForClass} from '@orion-js/typed-model'

const schema = getModelForClass(FileSchema).getSchema()

export default createModel<FileSchema>({
  name: 'File',
  schema: schema as ModelSchema,
  resolvers: () => require('./resolvers'),
  // this is only called when its child
  async clean(value) {
    if (!value) return null
    const fileId = value._id
    const file = await Files.findOne({_id: fileId})
    if (!file) return null
    const keys = Object.keys(omit(schema, 'createdBy', 'createdAt', 'status'))
    const data = pick(file, keys)
    return data
  }
})
