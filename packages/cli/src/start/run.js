import runProcess from './runProcess'
import runOnce from './runOnce'
import colors from 'colors/safe'
import sleep from '../helpers/sleep'

let appProcess = null

const restart = runOnce(async function() {
  if (appProcess) {
    console.log(colors.bold('=> Restarting...'))
    await new Promise(function(resolve) {
      appProcess.kill()
      appProcess.on('exit', function(code, signal) {
        if (signal === 'SIGTERM') {
          resolve()
        }
      })
    })
  }

  const options = global.processOptions
  appProcess = await runProcess({restart, options})
  console.log(colors.bold('=> App started\n'))

  await sleep(100)
})

export default restart
