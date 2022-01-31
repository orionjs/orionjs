export interface Credentials {
  accessKeyId: string
  secretAccessKey: string
  region: string
  bucket: string
  canUpload: Function
  basePath: string
}

let credentials: Partial<Credentials> = {}

export const setupFileManager = options => (credentials = options)

export const getAWSCredentials = () => credentials
