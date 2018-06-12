#!/usr/bin/env ./node_modules/babel-cli/bin/babel-node.js --presets env
import program from 'commander'
import start from './start'
import build from './build'
import colors from 'colors/safe'

const run = function(action) {
  return async function(...args) {
    try {
      await action(...args)
    } catch (e) {
      console.error(colors.red('Error: ' + e.message))
    }
  }
}

program
  .command('start')
  .description('Run the orionjs app')
  .option('-s, --shell', 'Opens a shell in Chrome developer tools')
  .action(run(start))

program
  .command('build')
  .description('Build a orionjs, exports it to a simple nodejs app')
  .option('-o, --output [output]', 'Output directory')
  .action(run(build))

program.parse(process.argv)
