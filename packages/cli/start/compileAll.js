import execute from './execute'
import globby from 'globby'
import compileFile from './compileFile'
import colors from 'colors/safe'

export default async function() {
  await execute('rm -rf .build')
  const files = await globby('app/**/*.js')

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
}
