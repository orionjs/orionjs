import { resolver, generateId, Model } from '@orion-js/app'
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getAWSCredentials } from '../credentials'
import Files from '../Files'


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
  returns: new Model({
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
    const { accessKeyId, secretAccessKey, region, bucket, canUpload, basePath } = getAWSCredentials()
    const s3 = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });

    if (canUpload) {
      if (!(await canUpload(params, viewer))) return null
    }

    const key = `${basePath}/${generateId()}-${params.name}`

    const fileId = await Files.insert({
      key,
      bucket,
      name: params.name,
      type: params.type,
      size: params.size,
      status: 'uploading',
      createdBy: viewer.userId,
      createdAt: new Date()
    })

    const result = await createPresignedPost(s3, {
      Bucket: bucket,
      Key: key,
      Conditions: [
        ['content-length-range', params.size, params.size],
        { 'Content-Type': params.type },
        { Key: key }
      ],
      Fields: {
        key: key,
        'Content-Type': params.type
      }
    })

    return {
      fileId,
      ...result,
      key
    }
  }
})
