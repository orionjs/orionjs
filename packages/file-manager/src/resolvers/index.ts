import fileManagerFile from './fileManagerFile'
import fileManagerFiles from './fileManagerFiles'
import completeUpload from './completeUpload'
import {generateUploadCredentials} from './generateUploadCredentials'
import type {GlobalResolver} from '@orion-js/resolvers'

// Define a type for our resolvers object
type ResolversMap = Record<string, GlobalResolver<any, any>>

const resolvers: ResolversMap = {
  fileManagerFile,
  fileManagerFiles,
  completeUpload,
  generateUploadCredentials,
}

export default resolvers
