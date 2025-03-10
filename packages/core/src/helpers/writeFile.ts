import fs from 'fs'
import ensureDirectory from '../helpers/ensureDirectory'

export default async function (path: string, content: string): Promise<void> {
  ensureDirectory(path)
  fs.writeFileSync(path, content)
}
