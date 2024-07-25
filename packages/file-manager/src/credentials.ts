import {FileSchema, FileSchemaColorsData, FileSchemaResizeData} from './File/schema'

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

  getResizedImages?: (file: FileSchema) => Promise<FileSchemaResizeData>
  getImageColors?: (file: FileSchema) => Promise<FileSchemaColorsData>
}

let savedOptions: Partial<FileManagerOptions> = {}

export const setupFileManager = (options: FileManagerOptions) => {
  savedOptions = options
}

/**
 * @deprecated use getFileManagerOptions instead
 */
export const getAWSCredentials = () => savedOptions

export const getFileManagerOptions = () => savedOptions
