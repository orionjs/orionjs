import path from 'path'
import fs from 'fs'

export default function(relativePath) {
  const buildPath = relativePath.replace('app/', './.orion/build/')
  const absolutePath = path.resolve(buildPath)
  try {
    fs.rmdirSync(absolutePath)
  } catch (error) {
    // console.error(error)
  }
}
