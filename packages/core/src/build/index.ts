import colors from 'colors/safe'
import execute from '../helpers/execute'
import writeIndex from '../start/watchAndCompile/writeIndex'
import {compile} from './compile'

export default async function ({output}) {
  if (!output) {
    output = './build'
  }

  console.log(colors.bold(`Cleaning directory ${output}...`))
  await execute(`rm -rf ${output}`)

  console.log(colors.bold('Compiling your app...'))

  compile({output})

  writeIndex({basePath: output})

  console.log(colors.bold('Build created'))
}
