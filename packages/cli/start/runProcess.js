import {exec} from 'child_process'
import colors from 'colors/safe'
import onExit from '../helpers/onExit'

let isExited = false

export default async function({restart}) {
  const MONGO_URL = process.env.MONGO_URL || global.localMongoURI
  let appProcess = exec('node .orion/build/index.js', {
    env: {
      MONGO_URL
    }
  })
  appProcess.stdout.pipe(process.stdout)
  appProcess.stderr.pipe(process.stderr)

  appProcess.on('exit', function(code, signal) {
    if (code === 0 || signal === 'SIGTERM' || signal === 'SIGINT') {
    } else {
      console.log(code, signal)
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
