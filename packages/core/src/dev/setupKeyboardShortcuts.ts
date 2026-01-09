import chalk from 'chalk'
import {Runner} from './runner'

/**
 * Sets up keyboard shortcuts for the dev server.
 * Listens for keypresses in raw mode to allow instant response.
 */
export function setupKeyboardShortcuts(runner: Runner): void {
  // Skip if not running in an interactive terminal (e.g., CI environment)
  if (!process.stdin.isTTY) return

  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.setEncoding('utf8')

  process.stdin.on('data', (key: string) => {
    if (key === 'r') {
      runner.restart()
    }

    // Handle Ctrl+C to gracefully exit
    if (key === '\u0003') {
      runner.stop()
      process.exit()
    }
  })

  console.log(chalk.dim('Press r to restart the server\n'))
}
