import fs from 'fs'
import path from 'path'

export default function(relativePath) {
  const buildPath = relativePath.replace('app/', './.orion/build/')
  const absolutePath = path.resolve(buildPath)

  try {
    fs.unlinkSync(absolutePath)
    if (absolutePath.endsWith('.js')) {
      fs.unlinkSync(absolutePath + '.map')
    }
  } catch (error) {
    console.error(error)
  }
}
