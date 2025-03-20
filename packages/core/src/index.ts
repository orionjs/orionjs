#!/usr/bin/env node
import chalk from 'chalk'
import {Command} from 'commander'
import create from './create'
import dev from './dev'
import prod from './prod'
import './handleErrors'
import version from './version'
import 'dotenv/config'
import check from './check'
import build from './build'

const program = new Command()

const run =
  action =>
  async (...args) => {
    try {
      await action(...args)
    } catch (e) {
      console.error(chalk.red(`Error: ${e.message}`))
    }
  }

program
  .command('dev')
  .description('Run the Orionjs app in development mode')
  .option('--shell', 'Opens a shell in Chrome developer tools')
  .option('--omit-cursor-rule', 'Omit the creation of the Orionjs Cursor rule')
  .option('--omit-mcp-server', 'Omit the creation of the Orionjs MCP server')
  .allowUnknownOption()
  .action(run(dev))

program.command('check').description('Runs a typescript check').action(run(check))

program
  .command('build')
  .description('Build the Orionjs app for production')
  .option('--output [path]', 'Path of the output file')
  .action(run(build))

program
  .command('prod')
  .allowUnknownOption()
  .option(
    '--path [path]',
    'Path of the compiled Orionjs app. If not provided, the app will be compiled and then run',
  )
  .description('Run the Orionjs app in production mode')
  .action(run(prod))

program
  .command('create')
  .description('Creates a new Orionjs project')
  .option('--name [name]', 'Name of the project')
  .option('--kit [kit]', 'Which starter kit to use')
  .action(run(create))

program.version(version, '-v --version')

program.parse(process.argv)

if (!process.argv.slice(2).length) {
  program.outputHelp()
}
