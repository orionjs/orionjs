import {spawn} from 'node:child_process'
import {existsSync} from 'node:fs'
import {fileURLToPath} from 'node:url'

function printHelp() {
  console.log(`orion-pulse

Usage:
  orion-pulse dashboard <mongodb-uri> [options]

Commands:
  dashboard  Start the read-only Pulse monitoring dashboard

Run "orion-pulse dashboard --help" for dashboard options.`)
}

const args = process.argv.slice(2)
if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  printHelp()
} else if (args[0] !== 'dashboard') {
  console.error(`Unknown command: ${args[0]}`)
  printHelp()
  process.exitCode = 1
} else {
  const dashboardPath = fileURLToPath(new URL('../assets/dashboard.js', import.meta.url))
  if (!existsSync(dashboardPath)) {
    console.error('Pulse dashboard assets are missing. Reinstall @orion-js/pulse.')
    process.exitCode = 1
  } else {
    const child = spawn('node', [dashboardPath, ...args.slice(1)], {
      env: process.env,
      stdio: 'inherit',
    })
    const forwardSignal = (signal: NodeJS.Signals) => {
      if (!child.killed) child.kill(signal)
    }
    process.once('SIGINT', () => forwardSignal('SIGINT'))
    process.once('SIGTERM', () => forwardSignal('SIGTERM'))
    child.once('error', error => {
      console.error(`Could not start Node.js: ${error.message}`)
      process.exitCode = 1
    })
    child.once('exit', (code, signal) => {
      if (signal) process.kill(process.pid, signal)
      else process.exitCode = code ?? 1
    })
  }
}
