export interface FileManagerOptions {
  accessKeyId: string
  secretAccessKey: string
  region: string
  bucket: string
  canUpload: Function
  getFileURL?: Function
  basePath: string
  endpoint?: string
  s3ForcePathStyle?: boolean
}

let savedOptions: Partial<FileManagerOptions> = {}

export const setupFileManager = (options: FileManagerOptions) => {
  savedOptions = options
}

export const getAWSCredentials = () => savedOptions
