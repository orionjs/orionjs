import chokidar from 'chokidar'
import path from 'path'

export default function(callback) {
  const options = {
    ignoreInitial: true
  }
  chokidar.watch('./app', options).on('all', (event, filepath) => {
    const relative = path.relative(process.cwd(), filepath)
    callback(relative)
  })
}
