import chokidar from 'chokidar'
import path from 'path'
import compileFile from '../compileFile'
import colors from 'colors/safe'
import deleteFile from './deleteFile'
import createFolder from './createFolder'
import deleteFolder from './deleteFolder'

export default function(callback) {
  const options = {
    ignoreInitial: true
  }
  const projectPath = path.resolve('./app')
  const watcher = chokidar.watch(projectPath, options)

  watcher.on('add', async filepath => {
    const relative = path.relative(process.cwd(), filepath)
    console.log(colors.bold(`=> File created -- ${relative} -- restarting`))

    await compileFile(relative)
    callback()
  })

  watcher.on('change', async filepath => {
    const relative = path.relative(process.cwd(), filepath)
    console.log(colors.bold(`=> File changed -- ${relative} -- restarting`))

    await compileFile(relative)
    callback()
  })
  watcher.on('unlink', async filepath => {
    const relative = path.relative(process.cwd(), filepath)
    console.log(colors.bold(`=> File removed -- ${relative} -- restarting`))

    deleteFile(relative)
    callback()
  })

  watcher.on('addDir', async forlderPath => {
    const relative = path.relative(process.cwd(), forlderPath)
    createFolder(relative)
  })

  watcher.on('unlinkDir', async forlderPath => {
    const relative = path.relative(process.cwd(), forlderPath)
    deleteFolder(relative)
  })
}
