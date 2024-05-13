import {Collection, createCollection} from '@orion-js/mongodb'
import File from '../File'
import {FileSchema} from '../File/schema'

export const Files: Collection<FileSchema> = createCollection<FileSchema>({
  name: 'filemanager_files',
  model: File,
  schema: FileSchema,
  indexes: [
    {
      keys: {
        key: 1,
        bucket: 1
      }
    },
    {
      keys: {
        hash: 1
      }
    }
  ]
})
