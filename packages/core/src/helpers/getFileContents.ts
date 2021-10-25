import fs from 'fs'

export function getFileContents(path: string): string {
  return fs.readFileSync(path).toString()
}
