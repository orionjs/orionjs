import fileManagerFile from './fileManagerFile'
import fileManagerFiles from './fileManagerFiles'
import completeUpload from './completeUpload'
import {generateUploadCredentials} from './generateUploadCredentials'
import type {Resolver} from '@orion-js/resolvers'

// Define a type for our resolvers object
type ResolversMap = Record<string, Resolver<any, any>>

const resolvers: ResolversMap = {
  fileManagerFile,
  fileManagerFiles,
  completeUpload,
  generateUploadCredentials,
}

export default resolvers
