import {spawn} from 'node:child_process'
import {ProdOptions} from './index'

export function runProd(options: ProdOptions, command: any) {
  const indexPath = `${options.path}/index.js`

  const args = ['--import=tsx', ...command.args, indexPath]
  spawn('node', args, {
    env: {
      NODE_ENV: 'production',
      ...process.env,
    },
    cwd: process.cwd(),
    stdio: 'inherit',
    gid: process.getgid(),
    uid: process.getuid(),
    detached: false,
  })
}
