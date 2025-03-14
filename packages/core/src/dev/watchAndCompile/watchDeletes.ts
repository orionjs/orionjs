import fs from 'node:fs'
import path from 'node:path'
import chokidar from 'chokidar'

export async function watchDeletes() {
  const projectPath = path.resolve('./app')
  const watcher = chokidar.watch(projectPath, {
    ignoreInitial: true,
  })

  watcher.on('unlink', async filepath => {
    if (!filepath.endsWith('.ts')) return

    const relative = path.relative(process.cwd(), filepath)
    const atBuildPath = path.resolve('.orion/build', relative.replace(/.ts$/, ''))
    try {
      fs.unlinkSync(`${atBuildPath}.js`)
      fs.unlinkSync(`${atBuildPath}.d.ts`)
    } catch (error) {
      console.log(
        `Error cleaning ${atBuildPath}. Restar project is suggested. Error: ${error.message}`,
      )
    }
  })
}
