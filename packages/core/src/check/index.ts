import chalk from 'chalk'
import {checkTs} from './checkTs'

export default async function () {
  console.log(chalk.bold(`Orionjs App ${chalk.green(chalk.bold('V4'))}\n`))
  console.log('Checking typescript...')

  checkTs()

  console.log(chalk.bold.green('Check passed\n'))
}
