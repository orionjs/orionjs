import {spawn} from 'node:child_process'

export function runProd() {
  spawn('./node_modules/@orion-js/core/node_modules/.bin/tsx', ['./app/index.ts'], {
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
