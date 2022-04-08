import fs from 'fs'
import path from 'path'

export function readFile(filePath: string) {
  if (!fs.existsSync(filePath)) return null

  return fs.readFileSync(filePath).toString()
}

export function writeFile(path: string, content: string) {
  ensureDirectory(path)
  fs.writeFileSync(path, content)
}

export function ensureDirectory(filePath) {
  const dirname = path.dirname(filePath)
  if (fs.existsSync(dirname)) return true
  ensureDirectory(dirname)
  fs.mkdirSync(dirname)
}
