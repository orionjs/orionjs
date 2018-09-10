import runProcess from './runProcess'
import runOnce from './runOnce'
import colors from 'colors/safe'
import sleep from '../helpers/sleep'
import isPortInUse from '../helpers/isPortInUse'

let appProcess = null

const restart = runOnce(async function() {
  if (appProcess) {
    console.log(colors.bold('=> Restarting...'))
    appProcess.kill()
    const port = process.env.PORT || 3000
    for (let i = 0; await isPortInUse(port); i++) {
      await sleep(10)
      // 5 secs
      if (i > 1000 * 5) {
        throw new Error('Port is in use')
      }
    }
  }

  const options = global.processOptions
  appProcess = await runProcess({restart, options})
  console.log(colors.bold('=> App started\n'))

  await sleep(100)
})

export default restart
