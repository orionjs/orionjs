import {modelResolver} from '@orion-js/resolvers'
import {getAWSCredentials} from '../../credentials'
import {FileSchema} from '../schema'

export function getFileURL(file: FileSchema): string {
  if (file.externalUrl) return file.externalUrl
  const options = getAWSCredentials()
  if (options.getFileURL) return options.getFileURL(file)
  return `https://s3.amazonaws.com/${file.bucket}/${encodeURIComponent(file.key)}`
}

export default modelResolver({
  returns: String,
  async resolve(file) {
    return getFileURL(file)
  }
})
