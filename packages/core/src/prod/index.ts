import chalk from 'chalk'
import build from '../build'
import {isBun} from '../helpers/isBun'
import {runProd} from './runProd'

export interface ProdOptions {
  path?: string
}

export default async function (options: ProdOptions, command: any) {
  console.log(chalk.bold(`\nOrionjs App ${chalk.green(chalk.bold('V4'))} Prod mode\n`))

  if (!isBun()) {
    if (!options.path) {
      await build({output: './build'})
      options.path = './build'
    }
  }

  runProd(options, command)
}
