import {transformFile} from 'babel-core'
import writeFile from '../helpers/writeFile'
import sourceMapSupport from 'babel-plugin-source-map-support'
import fs from 'fs'
import path from 'path'

const addSourceMapPath = function(path, code) {
  const sourceMapPath = `${process.cwd()}/${path}.map`
  return `${code}\n\n//# sourceMappingURL=${sourceMapPath}`
}

export default async function(relativeFilePath, dirPath = '.orion/build') {
  const filePath = path.resolve(relativeFilePath)
  const finalPath = path.resolve(relativeFilePath.replace(/^app/, dirPath))
  if (!filePath.endsWith('.js')) {
    const content = fs.readFileSync(filePath)
    writeFile(finalPath, content)
    return
  }

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

  await writeFile(finalPath, addSourceMapPath(finalPath, code))
  await writeFile(finalPath + '.map', JSON.stringify(map, null, 2))
}
