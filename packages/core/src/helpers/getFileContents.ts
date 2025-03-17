import fs from 'node:fs'

export default function readFile(filePath: string) {
  if (!fs.existsSync(filePath)) return null

  return fs.readFileSync(filePath).toString()
}
