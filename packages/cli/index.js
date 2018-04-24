#!/usr/bin/env babel-node --presets env

import program from 'commander'
import start from './start'

program
  .version('0.0.1')
  .command('start')
  .description('Run the orionjs app')
  .action(start)

program.parse(process.argv)
