import {resolver} from '@orion-js/resolvers'
import {generateId} from '@orion-js/helpers'
import {createModel} from '@orion-js/models'
import AWS from 'aws-sdk'
import {getAWSCredentials} from '../credentials'
import {Files} from '../Files'

export default resolver({
  params: {
    name: {
      type: String
    },
    size: {
      type: Number
    },
    type: {
      type: String
    }
  },
  returns: createModel({
    name: 'UploadCredentials',
    schema: {
      fileId: {
        type: 'ID'
      },
      url: {
        type: String
      },
      fields: {
        type: 'blackbox'
      },
      key: {
        type: String
      }
    }
  }),
  mutation: true,
  async resolve(params, viewer) {
    const {
      accessKeyId,
      secretAccessKey,
      region,
      bucket,
      endpoint,
      s3ForcePathStyle,
      canUpload,
      basePath
    } = getAWSCredentials()
    const s3 = new AWS.S3({
      accessKeyId,
      secretAccessKey,
      region,
      endpoint,
      s3ForcePathStyle
    })

    if (canUpload) {
      if (!(await canUpload(params, viewer))) return null
    }

    const key = `${basePath}/${generateId()}-${params.name}`

    const fileId = await Files.insertOne({
      key,
      bucket,
      name: params.name,
      type: params.type,
      size: params.size,
      status: 'uploading',
      createdBy: viewer.userId,
      createdAt: new Date()
    })

    const result = await new Promise<AWS.S3.PresignedPost>((resolve, reject) => {
      s3.createPresignedPost(
        {
          Bucket: bucket,
          Conditions: [
            ['content-length-range', params.size, params.size],
            {'Content-Type': params.type},
            {Key: key}
          ],
          Fields: {
            key: key,
            'Content-Type': params.type
          }
        },
        function (error, data) {
          if (error) reject(error)
          else resolve(data)
        }
      )
    })

    return {
      fileId,
      ...(result as object),
      key
    }
  }
})
