import chalk from 'chalk'
import {exec} from 'node:child_process'
import {promisify} from 'node:util'

const execPromise = promisify(exec)

export async function checkTs(): Promise<void> {
  try {
    console.log('Checking TypeScript...')
    await execPromise('tsc --noEmit', {
      cwd: process.cwd(),
      env: {
        ...process.env,
      },
      gid: process.getgid(),
      uid: process.getuid(),
    })
    console.log(chalk.green.bold('TypeScript check passed'))
  } catch (error) {
    console.log(chalk.red.bold('TypeScript compilation failed'))
    console.log(error.stderr || error.stdout || error.message)
    process.exit(1)
  }
}
