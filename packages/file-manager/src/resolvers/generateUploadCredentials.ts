import {createResolver} from '@orion-js/resolvers'
import {generateId, generateUUID} from '@orion-js/helpers'
import {S3Client} from '@aws-sdk/client-s3'
import {createPresignedPost} from '@aws-sdk/s3-presigned-post'
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
    const s3 = new S3Client({
      // without keys, fall back to the default AWS credential chain like aws-sdk v2 did
      credentials: accessKeyId ? {accessKeyId, secretAccessKey} : undefined,
      region,
      endpoint,
      forcePathStyle: s3ForcePathStyle,
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

    const result = await createPresignedPost(s3, {
      Bucket: bucket,
      Key: key,
      Conditions: [
        ['content-length-range', params.size, params.size],
        {'Content-Type': params.type},
        {'Cache-Control': 'public, max-age=31536000, immutable'},
      ],
      Fields: {
        'Content-Type': params.type,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })

    return {
      fileId,
      ...result,
      key,
    }
  },
})
