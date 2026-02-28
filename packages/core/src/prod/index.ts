import chalk from 'chalk'
import build from '../build'
import {runProd} from './runProd'

export interface ProdOptions {
  path?: string
  node?: boolean
}

export default async function (options: ProdOptions, command: any) {
  console.log(chalk.bold(`\nOrionjs App ${chalk.green(chalk.bold('V4'))} Prod mode\n`))

  if (options.node) {
    if (!options.path) {
      await build({output: './build'})
      options.path = './build'
    }
  }

  runProd(options, command)
}
