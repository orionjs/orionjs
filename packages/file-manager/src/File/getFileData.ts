import {createCollection} from '@orion-js/mongodb'

const readOnlyCollection = createCollection({name: 'filemanager_files'})

export async function getFileData(fileId: string) {
  const file = await readOnlyCollection.findOne({_id: fileId})
  return file
}
