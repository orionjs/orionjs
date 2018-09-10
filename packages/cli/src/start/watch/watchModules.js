import chokidar from 'chokidar'
import getModulesToWatch from '../../helpers/getModulesToWatch'
import colors from 'colors/safe'

export default function(callback) {
  const options = {
    ignoreInitial: true
  }

  const paths = getModulesToWatch()

  for (const modulePath of paths) {
    chokidar.watch(modulePath, options).on('all', (event, filepath) => {
      console.log(colors.bold(`=> Modules updated -- restarting`))
      callback()
    })
  }
}
