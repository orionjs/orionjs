#!/usr/bin/env node
import chalk from 'chalk'
import {Command} from 'commander'
import build from './build'
import create from './create'
import start from './start'
import test from './test'
import './handleErrors'
import version from './version'
import 'dotenv/config'

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
  .command('start')
  .description('Run the Orionjs app')
  .option('--shell', 'Opens a shell in Chrome developer tools')
  .option('--clean', 'Build the typescript project from scratch')
  .option('--omit-cursor-rule', 'Omit the creation of the Orionjs Cursor rule')
  .option('--omit-mcp-server', 'Omit the creation of the Orionjs MCP server')
  .action(run(start))

program.command('test').allowUnknownOption().description('Deprecated command').action(run(test))

program
  .command('build')
  .description('Compiles an Orionjs app and exports it to a simple nodejs app')
  .option('-o, --output [output]', 'Output directory')
  .action(run(build))

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
