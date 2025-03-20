import chalk from 'chalk'
import {runProd} from './runProd'
import build from '../build'

export interface ProdOptions {
  path?: string
}

export default async function (options: ProdOptions, command: any) {
  console.log(chalk.bold(`\nOrionjs App ${chalk.green(chalk.bold('V4'))} Prod mode\n`))

  if (!options.path) {
    await build({output: './build'})
    options.path = './build'
  }

  runProd(options, command)
}
