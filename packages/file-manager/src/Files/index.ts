import {Collection, createCollection} from '@orion-js/mongodb'
import {FileSchema} from '../File/schema'

export const Files: Collection<FileSchema> = createCollection<FileSchema>({
  name: 'filemanager_files',
  schema: FileSchema,
  indexes: [
    {
      keys: {
        key: 1,
        bucket: 1,
      },
    },
    {
      keys: {
        hash: 1,
      },
    },
  ],
})
