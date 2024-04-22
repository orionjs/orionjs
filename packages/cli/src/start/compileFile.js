import * as babel from '@babel/core'
import writeFile from '../helpers/writeFile'
import fs from 'fs'
import path from 'path'

const addSourceMapPath = function (filePath, code) {
  const sourceMapPath = `${path.basename(filePath)}.map`
  return `${code}\n\n//# sourceMappingURL=${sourceMapPath}`
}

export default async function (relativeFilePath, dirPath = '.orion/build') {
  const filePath = path.resolve(relativeFilePath)
  const finalPath = path.resolve(relativeFilePath.replace(/^app/, dirPath))

  if (!filePath.endsWith('.js') && !/\.tsx?$/.test(filePath)) {
    console.log('passindg as is file', filePath)
    const content = fs.readFileSync(filePath)
    writeFile(finalPath, content)
    return
  }

  const filename = relativeFilePath.replace(/\.tsx?$/, '.js')
  const babelOptions = {
    ast: false,
    filename,
    sourceMaps: true,
    sourceRoot: filePath.replace('/' + filename, ''),
    sourceFileName: '/' + filename
  }

  const {code, map} = await babel.transformFileAsync(filePath, babelOptions)

  const finalPathJS = finalPath.replace(/\.tsx?$/, '.js')
  await writeFile(finalPathJS, addSourceMapPath(finalPathJS, code))
  await writeFile(finalPathJS + '.map', JSON.stringify(map, null, 2))
}
