import fs from 'node:fs'
import path from 'node:path'

/**
 * Remove directory recursively
 * @param {string} dir_path
 * @see https://stackoverflow.com/a/42505874/3027390
 */
function rimraf(dir_path: string) {
  if (fs.existsSync(dir_path)) {
    fs.readdirSync(dir_path).map(entry => {
      const entry_path = path.join(dir_path, entry)
      if (fs.lstatSync(entry_path).isDirectory()) {
        rimraf(entry_path)
      } else {
        fs.unlinkSync(entry_path)
      }
    })
    fs.rmdirSync(dir_path)
  }
}

export default async function cleanDirectory() {
  try {
    const dirPath = path.join(process.cwd(), '.orion', 'build')
    rimraf(dirPath)
  } catch (_) {
    // Ignore errors during cleanup
  }
}
