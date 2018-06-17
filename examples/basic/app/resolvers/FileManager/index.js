import {resolvers, setupFileManager} from '@orion-js/file-manager'

const options = {
  accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
  bucket: process.env.AWS_S3_BUCKETNAME,
  region: process.env.AWS_S3_REGION,
  basePath: 'testing-sodlab',
  canUpload: function(params, viewer) {
    return true
  }
}

setupFileManager(options)

export default {
  ...resolvers
}
