import runProcess from './runProcess'
import runOnce from './runOnce'
import colors from 'colors/safe'
import sleep from '../helpers/sleep'
import waitForPorts from './waitForPorts'

let appProcess = null

const restart = runOnce(async function() {
  if (appProcess) {
    console.log('')
    console.log(colors.bold('=> Restarting...'))
    appProcess.kill()
    if (!(await waitForPorts())) {
      console.log(colors.bold.red('\n=> Error stopping app. Please start the app again'))
      process.exit()
      return
    }
  } else {
    if (!(await waitForPorts())) {
      const port = process.env.PORT || 3000
      console.log(colors.bold.red(`The port ${port} is used`))
      process.exit()
      return
    }
  }

  const options = global.processOptions
  appProcess = await runProcess({restart, options})
  console.log(colors.bold('=> App started\n'))

  await sleep(100)
})

export default restart
