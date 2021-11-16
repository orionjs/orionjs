import {modelResolver} from '@orion-js/resolvers'

export default modelResolver({
  returns: String,
  async resolve(file, viewer) {
    if (file.externalUrl) return file.externalUrl
    return `https://s3.amazonaws.com/${file.bucket}/${encodeURIComponent(file.key)}`
  }
})
