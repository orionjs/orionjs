import chokidar from 'chokidar'
import path from 'path'
import getModulesToWatch from '../helpers/getModulesToWatch'

export default function(callback) {
  const options = {
    ignoreInitial: true
  }

  const paths = getModulesToWatch()

  for (const modulePath of paths) {
    chokidar.watch(modulePath, options).on('all', (event, filepath) => {
      const relative = path.relative(process.cwd(), filepath)
      callback(relative)
    })
  }
}
