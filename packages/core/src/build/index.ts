import chalk from 'chalk'
import {build} from './build'
import cleanDirectory from '../dev/watchAndCompile/cleanDirectory'
import {checkTs} from './checkTs'

export default async function (options: {output?: string}) {
  console.log(chalk.bold(`Building Orionjs App ${chalk.green(chalk.bold('V4'))}...`))

  if (!options.output) {
    options.output = './build'
  }

  await cleanDirectory(options.output)

  await Promise.all([checkTs(), build(options)])

  console.log(chalk.bold('Build completed'))
}
