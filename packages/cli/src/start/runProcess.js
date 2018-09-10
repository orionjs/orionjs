import {spawn} from 'child_process'
import colors from 'colors/safe'
import onExit from '../helpers/onExit'
import writeFile from '../helpers/writeFile'

let isExited = false

export default async function({restart, options}) {
  const MONGO_URL = process.env.MONGO_URL || global.localMongoURI
  const inspect = options.shell ? '--inspect' : ''

  const command = `node ${inspect} .orion/build/index.js`
  const [first, ...args] = command.split(' ')
  let appProcess = spawn(first, args, {
    env: {
      MONGO_URL,
      ORION_DEV: 'local',
      ...process.env
    },
    cwd: process.cwd(),
    detached: true,
    stdio: 'inherit',
    shell: true
  })

  await writeFile('.orion/process', appProcess.pid)

  appProcess.on('exit', function(code, signal) {
    if (code === 0 || signal === 'SIGTERM' || signal === 'SIGINT') {
    } else {
      console.log(colors.bold('Exit code: ' + code))
      console.log(colors.bold('\n=> Error running app, restarting...'))
      appProcess.kill()
      setTimeout(() => {
        if (!isExited) {
          restart()
        }
      }, 2000)
    }
  })

  onExit(() => {
    isExited = true
    if (appProcess) {
      appProcess.kill()
    }
  })

  return appProcess
}
