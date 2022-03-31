#!/usr/bin/env node
import 'reflect-metadata'
import {Command} from 'commander'
import start from './start'
import build from './build'
import colors from 'colors/safe'
import test from './test'
import './handleErrors'
import version from './version'
import 'dotenv/config'
import envInit from './env/init'
import envAdd from './env/add'

const program = new Command()

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
  .option('--clean', 'Build the typescript project from scratch')
  .option('--env-path <path>', 'Specify the env file name')
  .action(run(start))

program.command('test').allowUnknownOption().description('Deprecated command').action(run(test))

program
  .command('build')
  .description('Compiles an Orionjs app and exports it to a simple nodejs app')
  .option('-o, --output [output]', 'Output directory')
  .option('--env-path <path>', 'Specify the env file name')
  .action(run(build))

program
  .command('env-init')
  .description('Creates a new encrypted env file')
  .option('--env-path <path>', 'Specify the env file name')
  .action(run(envInit))

program
  .command('env-add')
  .description('Adds a new environment to the encrypted env file')
  .option('--env-path <path>', 'Specify the env file name')
  .action(run(envAdd))

program.version(version, '-v --version')

program.parse(process.argv)

if (!process.argv.slice(2).length) {
  program.outputHelp()
}
