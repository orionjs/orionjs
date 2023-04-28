export interface Credentials {
  accessKeyId: string
  secretAccessKey: string
  region: string
  bucket: string
  canUpload: Function
  basePath: string
  endpoint?: string
  s3ForcePathStyle?: boolean
}

let credentials: Partial<Credentials> = {}

export const setupFileManager = options => (credentials = options)

export const getAWSCredentials = () => credentials
