import {spawn} from 'node:child_process'

export function runProd() {
  spawn('tsx', ['./app/index.ts'], {
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
