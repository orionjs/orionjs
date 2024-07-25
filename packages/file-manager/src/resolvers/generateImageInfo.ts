import {isEmpty} from 'lodash'
import {getFileManagerOptions} from '../credentials'
import {isImage} from '../File/resolvers/isImage'
import {FileSchema} from '../File/schema'
import {Files} from '../Files'

export async function generateImageInfo(file: FileSchema) {
  if (!file._id) return

  const options = getFileManagerOptions()

  if (isImage(file)) {
    if (!file.dimensions && options.getImageDimensions) {
      try {
        file.dimensions = await options.getImageDimensions(file)
        if (!isEmpty(file.dimensions)) {
          await Files.updateOne(file._id, {$set: {dimensions: file.dimensions}})
        }
      } catch (error) {
        console.error('Error getting image dimensions', error)
      }
    }

    if (!file.resizedData && options.getResizedImages) {
      try {
        file.resizedData = await options.getResizedImages(file)
        if (!isEmpty(file.resizedData)) {
          await Files.updateOne(file._id, {$set: {resizedData: file.resizedData}})
        }
      } catch (error) {
        console.error('Error getting resized images', error)
      }
    }

    if (!file.colorsData && options.getImageColors) {
      try {
        file.colorsData = await options.getImageColors(file)
        if (!isEmpty(file.colorsData)) {
          await Files.updateOne(file._id, {$set: {colorsData: file.colorsData}})
        }
      } catch (error) {
        console.error('Error getting image colors', error)
      }
    }
  }
}
