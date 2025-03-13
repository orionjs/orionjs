import {createResolver} from '@orion-js/resolvers'
import {Files} from '../Files'
import {generateImageInfo} from './generateImageInfo'
import {FileSchema} from '../File/schema'

export default createResolver({
  params: {
    fileId: {
      type: 'ID',
    },
  },
  returns: FileSchema,
  mutation: true,
  async resolve({fileId}, viewer) {
    const file = await Files.findOne({createdBy: viewer.userId, _id: fileId})
    await Files.updateOne(file, {$set: {status: 'uploaded'}})

    // mientras el usuario sigue editando el formulario, se generan los resizes y colores
    await generateImageInfo(file)

    return file
  },
})
