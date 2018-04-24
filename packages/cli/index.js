#!/usr/bin/env babel-node --presets es2015,stage-2

import program from 'commander'
import start from './start'

program
  .version('0.0.1')
  .command('start')
  .description('Run the orionjs app')
  .action(start)

program.parse(process.argv)
