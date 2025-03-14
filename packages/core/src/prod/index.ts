import chalk from 'chalk'
import {runProd} from './runProd'
import {checkTs} from './checkTs'
export default async function () {
  console.log(chalk.bold(`\nOrionjs App ${chalk.green(chalk.bold('V4'))} Prod mode\n`))

  checkTs()
  runProd()
}
