import execute from '../helpers/execute'
import globby from 'globby'
import compileFile from './compileFile'
import colors from 'colors/safe'
import path from 'path'

export default async function(dirPath) {
  const finalDirPath = path.join(dirPath, 'app')
  await execute(`rm -rf ${finalDirPath}`)
  const files = await globby('app/**/*.js')
  try {
    await Promise.all(files.map(file => compileFile(file, finalDirPath)))
    return true
  } catch (error) {
    await execute(`rm -rf ${finalDirPath}`)
    console.log(colors.red(`=> Syntax error at ${error.message}`))
    if (error._babel) {
      console.log(error.codeFrame)
    } else {
      console.error(colors.red(error))
    }
    return false
  }
}
