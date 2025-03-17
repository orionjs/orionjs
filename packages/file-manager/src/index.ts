import resolvers from './resolvers'
import {setupFileManager, getAWSCredentials, FileManagerOptions} from './credentials'
import {Files} from './Files'
import {getFileURL} from './File/resolvers/url'
import {FileSchema} from './File/schema'

export {
  resolvers,
  FileManagerOptions,
  setupFileManager,
  getAWSCredentials,
  Files,
  getFileURL,
  FileSchema,
}
