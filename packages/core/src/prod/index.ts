import chalk from 'chalk'
import {runProd} from './runProd'
import {checkTs} from './checkTs'

export default async function (_, command: any) {
  console.log(chalk.bold(`\nOrionjs App ${chalk.green(chalk.bold('V4'))} Prod mode\n`))

  checkTs()
  runProd(command)
}
