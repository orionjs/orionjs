import {spawn} from 'node:child_process'
import type {Runner} from '../runner'
import {getConfigPath} from './getConfigPath'

/**
 * Create a serialized, on-demand TypeScript checker.
 *
 * `tsc --watch` creates a second filesystem watcher for the entire project and
 * can stall when the operating system is already watching many worktrees. A
 * one-off check is both faster and sufficient because the bundle watcher calls
 * this function after every source change. Changes received during an active
 * check collapse into one fresh check, so stale diagnostics never stop the app.
 */
export function watchAndTypecheck(runner: Runner) {
  const configPath = getConfigPath()
  let checkInProgress = false
  let checkRequested = false

  const runCheck = () => {
    if (checkInProgress) {
      checkRequested = true
      return
    }

    checkInProgress = true
    const startedAt = Date.now()
    const checker = spawn('tsc', ['--noEmit', '--project', configPath], {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let output = ''
    let spawnError: Error | undefined

    checker.stdout.on('data', chunk => {
      output += chunk.toString()
    })
    checker.stderr.on('data', chunk => {
      output += chunk.toString()
    })
    checker.on('error', error => {
      spawnError = error
    })

    checker.on('close', code => {
      checkInProgress = false

      // A newer save makes this result stale. Check the latest project state
      // before changing the running application's state or printing errors.
      if (checkRequested) {
        checkRequested = false
        runCheck()
        return
      }

      if (spawnError) {
        runner.stop()
        console.error(`Unable to run TypeScript: ${spawnError.message}`)
        return
      }

      const duration = Date.now() - startedAt
      if (code === 0) {
        console.log(`=> TypeScript checked in ${duration}ms`)
        runner.start()
        return
      }

      if (output.trim()) console.error(output.trimEnd())
      console.error(`=> TypeScript found errors in ${duration}ms`)
      runner.stop()
    })
  }

  return runCheck
}
