import fs from 'node:fs'
import path from 'node:path'

const ensureDirectory = filePath => {
  const dirname = path.dirname(filePath)
  if (fs.existsSync(dirname)) return true
  ensureDirectory(dirname)
  fs.mkdirSync(dirname)
}

export default ensureDirectory
