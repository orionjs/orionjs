import {resolver} from '@orion-js/app'

export default resolver({
  returns: String,
  async resolve(file, viewer) {
    return `https://s3.amazonaws.com/${file.bucket}/${file.key}`
  }
})
