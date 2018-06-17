import {resolver} from '@orion-js/app'

export default resolver({
  returns: String,
  async resolve(file, viewer) {
    const {type} = file
    if (type.startsWith('image/')) return 'image'
    if (type.startsWith('application/pdf')) return 'pdf'
    return 'unknown'
  }
})
