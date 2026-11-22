import {setupFileManager} from '../credentials'
import {generateUploadCredentials} from './generateUploadCredentials'

describe('generateUploadCredentials', () => {
  it('returns a signed S3 POST policy restricted to the file key, size and type', async () => {
    setupFileManager({
      accessKeyId: 'AKIAEXAMPLE',
      secretAccessKey: 'secret',
      region: 'us-east-1',
      bucket: 'test-bucket',
      basePath: 'uploads',
      canUpload: async () => true,
    })

    const actual = await generateUploadCredentials.execute({
      params: {name: 'photo.png', size: 1234, type: 'image/png'},
      viewer: {userId: 'user-1'},
    })

    expect(actual.fileId).toMatch(/^ofl-/)
    expect(actual.key).toMatch(/^uploads\/.+-photo\.png$/)
    expect(actual.url).toContain('test-bucket')
    expect(actual.fields).toMatchObject({
      key: actual.key,
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    })
    expect(actual.fields['X-Amz-Signature']).toBeTruthy()

    const policy = JSON.parse(Buffer.from(actual.fields.Policy, 'base64').toString())
    expect(policy.conditions).toEqual(
      expect.arrayContaining([
        ['content-length-range', 1234, 1234],
        {'Content-Type': 'image/png'},
        {key: actual.key},
        {bucket: 'test-bucket'},
      ]),
    )
  })
})
