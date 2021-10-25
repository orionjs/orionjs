import fs from 'fs'
import path from 'path'

const ensureDirectory = function (filePath) {
  const dirname = path.dirname(filePath)
  if (fs.existsSync(dirname)) return true
  ensureDirectory(dirname)
  fs.mkdirSync(dirname)
}

export default ensureDirectory
