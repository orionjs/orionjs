import {modelResolver} from '@orion-js/resolvers'

export default modelResolver({
  returns: String,
  async resolve(file, viewer) {
    const {type} = file
    if (!type) return 'unknown'
    if (type.startsWith('image/')) return 'image'
    if (type.startsWith('application/pdf')) return 'pdf'
    return 'unknown'
  }
})
