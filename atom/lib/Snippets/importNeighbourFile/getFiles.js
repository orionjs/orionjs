'use babel'
import fs from 'fs-plus'

export default function(file) {
  const basePath = file.path.replace(/\/[\w.]+$/, '')
  const paths = fs.listSync(basePath)
  const names = paths.map(path => path.replace(/.*\//, '').replace(/\.\w+/, ''))
  return names
}
