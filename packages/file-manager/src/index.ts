import resolvers from './resolvers'
import {setupFileManager, getAWSCredentials} from './credentials'
import File from './File'
import {Files} from './Files'
import {getFileURL} from './File/resolvers/url'
import {FileSchema} from './File/schema'

export {resolvers, setupFileManager, getAWSCredentials, File, Files, getFileURL, FileSchema}
