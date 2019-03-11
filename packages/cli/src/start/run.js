import runProcess from './runProcess'
import runOnce from './runOnce'
import colors from 'colors/safe'
import sleep from '../helpers/sleep'
import waitForPorts from './waitForPorts'
import killProcess from './killProcess'
import waitAppStopped from './waitAppStopped'
import {setOnExit} from '../helpers/onExit'

setOnExit(async () => {
  await waitAppStopped()
})

global.appProcess = null

const restart = runOnce(async function() {
  if (global.appProcess) {
    console.log('')
    console.log(colors.bold('=> Restarting...'))
    await killProcess()
  } else {
    if (!(await waitForPorts())) {
      const port = process.env.PORT || 3000
      console.log(colors.bold.red(`The port ${port} is used`))
      process.exit()
      return
    }
  }

  const options = global.processOptions
  global.appProcess = await runProcess({restart, options})
  console.log(colors.bold('=> App started\n'))

  await sleep(100)
})

export default restart
