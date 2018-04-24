import {exec} from 'child_process'
import colors from 'colors/safe'

export default function({restart}) {
  let appProcess = exec('node .build/index.js')

  appProcess.stdout.pipe(process.stdout)
  appProcess.stderr.pipe(process.stderr)

  appProcess.on('exit', function(code, signal) {
    if (code === 0) {
    } else {
      console.log(colors.bold('\n=> Error running app, restarting...'))
      setTimeout(() => {
        restart()
      }, 2000)
    }
  })

  return appProcess
}
