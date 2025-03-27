#!/usr/bin/env node
import {Command} from 'commander'
import chalk from 'chalk'
import envInit from './init'
import envAdd from './add'
import envRead from './read'

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
  .command('init')
  .description('Creates a new encrypted env file')
  .option('--path <path>', 'Specify the env file name')
  .action(run(envInit))

program
  .command('add')
  .description('Adds a new environment to the encrypted env file')
  .option('--path <path>', 'Specify the env file name')
  .action(run(envAdd))

program
  .command('read')
  .description('Prints the value of the env file in JSON or a specific variable in plain text')
  .option('--path <path>', 'Specify the env file name')
  .option('--key <key>', 'Prints the value of a specific variable in plain text')
  .option('--secret <secret>', 'The password to decrypt the keys')
  .action(run(envRead))

program.parse(process.argv)

if (!process.argv.slice(2).length) {
  program.outputHelp()
}
