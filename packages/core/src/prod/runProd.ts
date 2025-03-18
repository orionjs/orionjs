import {spawn} from 'node:child_process'

export function runProd(command: any) {
  const args = [...command.args, './app/index.ts']
  spawn('tsx', args, {
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
