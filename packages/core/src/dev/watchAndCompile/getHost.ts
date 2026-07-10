import {spawn} from 'node:child_process'
import {createInterface} from 'node:readline'
import type {Runner} from '../runner'
import {getConfigPath} from './getConfigPath'

export function getHost(runner: Runner) {
  const configPath = getConfigPath()
  const watcher = spawn('tsc', ['--watch', '--noEmit', '--project', configPath], {
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const output = createInterface({input: watcher.stdout})
  output.on('line', line => {
    console.log(line)

    if (line.includes('Starting compilation') || line.includes('File change detected')) {
      runner.stop()
      return
    }

    if (line.includes('Found 0 errors.')) {
      runner.start()
      return
    }

    if (/Found [1-9]\d* errors?\./.test(line)) {
      runner.stop()
    }
  })

  const errors = createInterface({input: watcher.stderr})
  errors.on('line', line => console.error(line))

  watcher.on('error', error => {
    runner.stop()
    console.error(`Unable to start TypeScript: ${error.message}`)
  })

  return watcher
}
