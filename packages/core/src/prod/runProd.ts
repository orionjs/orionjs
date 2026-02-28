import {spawn} from 'node:child_process'
import {ProdOptions} from './index'

export function runProd(options: ProdOptions, command: any) {
  if (options.node) {
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
    return
  }

  const args = [...command.args, './app/index.ts']
  spawn('bun', args, {
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
