import {resolver} from '@orion-js/resolvers'
import File from '../File'
import Files from '../Files'

export default resolver({
  params: {
    fileId: {
      type: 'ID'
    }
  },
  returns: File,
  async resolve({fileId}, viewer) {
    return await Files.findOne(fileId)
  }
})
