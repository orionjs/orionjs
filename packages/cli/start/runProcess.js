import {exec} from 'child_process'
import colors from 'colors/safe'
import onExit from '../helpers/onExit'
import writeFile from '../helpers/writeFile'

let isExited = false

export default async function({restart, options}) {
  const MONGO_URL = process.env.MONGO_URL || global.localMongoURI
  const inspect = options.shell ? '--inspect' : ''
  let appProcess = exec(`node ${inspect} .orion/build/index.js`, {
    env: {
      MONGO_URL,
      ORION_DEV: 'local',
      FORCE_COLOR: true
    }
  })

  appProcess.stdout.pipe(process.stdout)
  appProcess.stderr.pipe(process.stderr)

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
