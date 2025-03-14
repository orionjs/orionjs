import chalk from 'chalk'
import execute from '../helpers/execute'
import {compile} from './compile'

export default async function ({output}) {
  if (!output) {
    output = './build'
  }

  console.log(chalk.bold(`Cleaning directory ${output}...`))
  await execute(`rm -rf ${output}`)

  console.log(chalk.bold('Compiling your app...'))

  compile({output})

  console.log(chalk.bold('Build created'))
}
