import {createResolver} from '@orion-js/resolvers'
import {Files} from '../Files'
import {FileSchema} from '../File/schema'

export default createResolver({
  params: {
    fileId: {
      type: 'ID',
    },
  },
  returns: FileSchema,
  async resolve({fileId}) {
    return await Files.findOne(fileId)
  },
})
