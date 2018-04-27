#!/usr/bin/env babel-node --presets env

import program from 'commander'
import start from './start'

program
  .command('start')
  .description('Run the orionjs app')
  .option('-s, --shell', 'Opens a shell in Chrome developer tools')
  .action(start)

program.parse(process.argv)
