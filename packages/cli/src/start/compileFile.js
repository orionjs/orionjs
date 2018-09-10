import {transformFile} from 'babel-core'
import writeFile from '../helpers/writeFile'
import sourceMapSupport from 'babel-plugin-source-map-support'
import sourceMapTrace from 'babel-plugin-stack-trace-sourcemap'
import fs from 'fs'
import path from 'path'

const addSourceMapPath = function(filePath, code) {
  const sourceMapPath = `${path.basename(filePath)}.map`
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
    plugins: [sourceMapSupport, sourceMapTrace],
    filename: relativeFilePath,
    sourceMaps: true,
    sourceRoot: filePath.replace('/' + relativeFilePath, ''),
    sourceFileName: '/' + relativeFilePath
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
