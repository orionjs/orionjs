import runProcess from './runProcess'
import runOnce from './runOnce'
import colors from 'colors/safe'
import sleep from '../helpers/sleep'

let appProcess = null

const restart = runOnce(async function() {
  if (appProcess) {
    console.log(colors.bold('=> Restarting...'))
    appProcess.kill()
    await sleep(100)
  }
  appProcess = await runProcess({restart})
  console.log(colors.bold('=> App started\n'))

  await sleep(100)
})

export default restart
