import {ModelSchema, createModel} from '@orion-js/models'
import {Files} from '../Files'
import pick from 'lodash/pick'
import omit from 'lodash/omit'
import {FileSchema} from './schema'
import {getModelForClass} from '@orion-js/typed-model'
import {isImage} from './resolvers/isImage'
import {getFileManagerOptions} from '../credentials'
import {isEmpty} from 'lodash'

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

    if (isImage(file)) {
      const options = getFileManagerOptions()
      if (!file.resizedData && options.getResizedImages) {
        try {
          file.resizedData = await options.getResizedImages(file)
          if (!isEmpty(file.resizedData)) {
            await Files.updateOne(file, {$set: {resizedData: file.resizedData}})
          }
        } catch (error) {
          console.error('Error getting resized images', error)
        }
      }
      if (!file.colorsData && options.getImageColors) {
        try {
          file.colorsData = await options.getImageColors(file)
          if (!isEmpty(file.colorsData)) {
            await Files.updateOne(file, {$set: {colorsData: file.colorsData}})
          }
        } catch (error) {
          console.error('Error getting image colors', error)
        }
      }
    }

    const keys = Object.keys(omit(schema, 'createdBy', 'createdAt', 'status'))
    const data = pick(file, keys)
    return data
  },
})
