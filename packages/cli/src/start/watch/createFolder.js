import path from 'path'
import ensureDirectory from '../../helpers/ensureDirectory'

export default function(relativePath) {
  const buildPath = relativePath.replace('app/', './.orion/build/')
  const absolutePath = path.resolve(buildPath)
  ensureDirectory(absolutePath + '/file')
}
