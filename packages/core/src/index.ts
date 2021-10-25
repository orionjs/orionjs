#!/usr/bin/env node --experimental-specifier-resolution=node --no-warnings
import program from 'commander'
import start from './start'
import build from './build'
import colors from 'colors/safe'
import create from './create'
import test from './test'
import './handleErrors'
import version from './version'

const run = function (action) {
  return async function (...args) {
    try {
      await action(...args)
    } catch (e) {
      console.error(colors.red('Error: ' + e.message))
    }
  }
}

program
  .command('start')
  .description('Run the Orionjs app')
  .option('--shell', 'Opens a shell in Chrome developer tools')
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
