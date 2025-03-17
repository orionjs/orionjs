import {createCollection} from '@orion-js/mongodb'
import {FileSchema} from '../File/schema'

export const Files = createCollection({
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
