import {transformFile} from 'babel-core'
import writeFile from '../helpers/writeFile'
import sourceMapSupport from 'babel-plugin-source-map-support'

const addSourceMapPath = function(path, code) {
  const sourceMapPath = `${process.cwd()}/${path}.map`
  return `${code}\n\n//# sourceMappingURL=${sourceMapPath}`
}

export default async function(filePath, dirPath) {
  const babelOptions = {
    ast: false,
    plugins: [sourceMapSupport],
    sourceMaps: true
  }

  const {code, map} = await new Promise(function(resolve, reject) {
    transformFile(filePath, babelOptions, function(error, result) {
      if (error) reject(error)
      else resolve(result)
    })
  })

  const finalPath = filePath.replace(/^app/, dirPath)
  await writeFile(finalPath, addSourceMapPath(finalPath, code))
  await writeFile(finalPath + '.map', JSON.stringify(map, null, 2))
}
