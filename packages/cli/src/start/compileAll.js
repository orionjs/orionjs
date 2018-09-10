import execute from '../helpers/execute'
import globby from 'globby'
import compileFile from './compileFile'
import colors from 'colors/safe'
import runOnce from './runOnce'

export default runOnce(async function() {
  console.log(colors.bold('=> Compiling...'))
  await execute('rm -rf .orion/build')
  const files = await globby('app/**/*')
  try {
    await Promise.all(files.map(file => compileFile(file)))
    return true
  } catch (error) {
    console.log(colors.red(`=> Syntax error at ${error.message}`))
    if (error._babel) {
      console.log(error.codeFrame)
    } else {
      console.error(colors.red(error))
    }
    return false
  }
})
