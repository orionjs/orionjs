import resolvers from './resolvers'
import {setupFileManager, getAWSCredentials} from './credentials'
import {Files} from './Files'
import {getFileURL} from './File/resolvers/url'
import {FileSchema} from './File/schema'

export {resolvers, setupFileManager, getAWSCredentials, Files, getFileURL, FileSchema}
