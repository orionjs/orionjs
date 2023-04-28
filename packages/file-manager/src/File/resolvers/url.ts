import {modelResolver} from '@orion-js/resolvers'
import {getAWSCredentials} from '../../credentials'

export default modelResolver({
  returns: String,
  async resolve(file, viewer) {
    if (file.externalUrl) return file.externalUrl
    const options = getAWSCredentials()
    if (options.getFileURL) return options.getFileURL(file)
    return `https://s3.amazonaws.com/${file.bucket}/${encodeURIComponent(file.key)}`
  }
})
