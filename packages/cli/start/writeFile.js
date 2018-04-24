import fs from 'fs'
import path from 'path'

const ensureDirExistence = function(filePath) {
  const dirname = path.dirname(filePath)
  if (fs.existsSync(dirname)) return true
  ensureDirExistence(dirname)
  fs.mkdirSync(dirname)
}

export default async function(path, content) {
  ensureDirExistence(path)
  fs.writeFileSync(path, content)
}
