---
id: files
title: Files
sidebar_label: Files
sidebar_position: 4
---

## Install Files package

OrionJS provides file upload and management through the [`file-manager`](https://github.com/orionjs/orionjs/blob/master/packages/file-manager) package.

```bash npm2yarn
npm install @orion-js/file-manager
```

## Configuration

The configuration of `file-manager` is done by setting the following environment variables:

- `AWS_S3_ACCESS_KEY_ID`: A valid AWS Access Key used along with the AWS_S3_SECRET_ACCESS_KEY to cryptographically sign programmatic AWS requests.
- `AWS_S3_SECRET_ACCESS_KEY`: A valid AWS Secret Access Key corresponding to the previous key.
- `AWS_S3_BUCKETNAME`: The name of the bucket where uploaded files will be storaged into.
- `AWS_S3_REGION`: The region where the bucket resides.

To enable file management you must pass the options when initializing the File-Manager resolvers.

```js
import {resolvers, setupFileManager} from '@orion-js/file-manager'

const options = {
  accessKeyId: <AWS_S3_ACCESS_KEY_ID>,
  secretAccessKey: <AWS_S3_SECRET_ACCESS_KEY>
  bucket: <AWS_S3_BUCKETNAME>,
  region: <AWS_S3_REGION>,
  basePath: 'basePath',
  canUpload: function(params, viewer) {
    return true
  }
}

setupFileManager(options)

export default {
  ...resolvers
}
```

inside the `options` object sended to `setupFileManager` must be entered the credentials of the S3 storage of AWS that will be used. Particularly, `basePath` receives a string with the route folder used to storage a particular oploaded file.

## Uploading a File

### Setting a File type in schema

When creating a new Schema, a File type can be set along the basic type properties already defined.

```js
import {File} from '@orion-js/file-manager'

export default {
  title: {
    type: String
  },
  description: {
    type: String
  },
  cover: {
    type: File
  }
}
```

### Uploading file

`File` has its own internal schema (see [`File`](https://github.com/orionjs/orionjs/tree/master/packages/file-manager/src/File)). When uploading a document with a File type field, make sure that the JSON uploaded inside the document fits the File schema so it passes it's respective [schema validations](https://orionjs.com/docs/schema).

### Getting file data

As mentioned before, `File` is a Model by itself with its own schema, which implies that accessing its information has its own set of rules. The `File` Model possesses the following ready-to-access properties:

- `key` : The name of the file in the S3 storage, with its own concatenated hash.
- `bucket` : The name of the bucket used to upload an keep the uploaded files in the S3 storage.
- `name` : The original name of the file.
- `type` : The type of the file. Currently, it manages `png` and `jpg` for images, and `pdf`.
- `size` : The amount of bytes of the file.

Besides, the URL of the file saved in the S3 storage can be obtained through the url() [`model resolver`](https://orionjs.com/docs/models#resolvers):

```js
const album = await Albums.findOne(albumId)
// album = {title, description, cover}
return await album.cover.url()
```
