'use babel'
import fs from 'fs-plus'

export default function(file) {
  const basePath = file.path.replace(/app\/.*$/, 'app/models')
  const paths = fs.listSync(basePath)
  const collectionNames = paths
    .map(path => path.replace(/.*\//, ''))
    .filter(name => !name.includes('.'))
  return collectionNames
}
