import chokidar from 'chokidar'
import path from 'path'

export default function(callback) {
  const options = {
    ignoreInitial: true
  }
  const projectPath = path.resolve('./app')
  chokidar.watch(projectPath, options).on('all', (event, filepath) => {
    const relative = path.relative(process.cwd(), filepath)
    callback(relative)
  })
}
