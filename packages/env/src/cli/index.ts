#!/usr/bin/env node
import {Command} from 'commander'
import colors from 'colors/safe'
import envInit from './init'
import envAdd from './add'

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
  .command('init')
  .description('Creates a new encrypted env file')
  .option('--path <path>', 'Specify the env file name')
  .action(run(envInit))

program
  .command('add')
  .description('Adds a new environment to the encrypted env file')
  .option('--path <path>', 'Specify the env file name')
  .action(run(envAdd))

program.parse(process.argv)

if (!process.argv.slice(2).length) {
  program.outputHelp()
}
