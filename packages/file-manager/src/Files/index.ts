import {createCollection} from '@orion-js/mongodb'
import File from '../File'

export default createCollection({
  name: 'filemanager_files',
  model: File,
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
