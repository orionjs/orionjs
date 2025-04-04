import {createResolver} from '@orion-js/resolvers'
import {generateId, generateUUID} from '@orion-js/helpers'
import AWS from 'aws-sdk'
import {getAWSCredentials} from '../credentials'
import {Files} from '../Files'
import {schemaWithName} from '@orion-js/schema'

export const generateUploadCredentials = createResolver({
  params: {
    name: {
      type: 'string',
    },
    size: {
      type: 'number',
    },
    type: {
      type: 'string',
    },
  },
  returns: schemaWithName('UploadCredentials', {
    fileId: {
      type: 'ID',
    },
    url: {
      type: 'string',
    },
    fields: {
      type: 'blackbox',
    },
    key: {
      type: 'string',
    },
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
      basePath,
    } = getAWSCredentials()
    const s3 = new AWS.S3({
      accessKeyId,
      secretAccessKey,
      region,
      endpoint,
      s3ForcePathStyle,
    })

    if (canUpload) {
      if (!(await canUpload(params, viewer))) return null
    }

    const key = `${basePath}/${generateId()}-${params.name}`

    const {insertedId: fileId} = await (await Files.getRawCollection()).insertOne({
      _id: `ofl-${generateUUID()}`,
      key,
      bucket,
      name: params.name,
      type: params.type,
      size: params.size,
      status: 'uploading',
      createdBy: viewer.userId,
      createdAt: new Date(),
    })

    const result = await new Promise<AWS.S3.PresignedPost>((resolve, reject) => {
      s3.createPresignedPost(
        {
          Bucket: bucket,
          Conditions: [
            ['content-length-range', params.size, params.size],
            {'Content-Type': params.type},
            {'Cache-Control': 'public, max-age=31536000, immutable'},
            {Key: key},
          ],
          Fields: {
            key: key,
            'Content-Type': params.type,
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        },
        (error, data) => {
          if (error) reject(error)
          else resolve(data)
        },
      )
    })

    return {
      fileId,
      ...(result as any),
      key,
    }
  },
})
