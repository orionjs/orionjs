import chalk from 'chalk'
import {execSync} from 'node:child_process'

export function checkTs() {
  try {
    execSync('tsc --noEmit', {
      cwd: process.cwd(),
      env: {
        ...process.env,
      },
      gid: process.getgid(),
      uid: process.getuid(),
      stdio: 'inherit',
    })
  } catch {
    console.log(chalk.red.bold('TypeScript compilation failed'))
    process.exit(1)
  }
}
