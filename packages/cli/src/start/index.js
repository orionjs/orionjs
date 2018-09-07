import fs from 'fs'
import compileAll from './compileAll'
import run from './run'
import colors from 'colors/safe'
import getModulesToWatch from '../helpers/getModulesToWatch'
import defer from './defer'
import startDB from './startDB'
import watchProject from './watchProject'

let hasChanges = false

const onAppChange = defer(async function() {
  const success = await compileAll()
  if (success) {
    await run()
  }
  hasChanges = false
}, 200)

const onDependencyChange = defer(async function() {
  await run()
  hasChanges = false
}, 2000)

const watch = function() {
  watchProject(function(path) {
    if (!hasChanges) console.log('')
    hasChanges = true
    console.log(colors.bold(`=> File changed -- ${path} -- restarting`))
    onAppChange()
  })

  const moduleListener = async function(event, fileName) {
    if (!hasChanges) console.log('')
    hasChanges = true
    console.log(colors.bold(`=> Modules updated -- restarting`))
    onDependencyChange()
  }

  const paths = getModulesToWatch()
  for (const path of paths) {
    fs.watch(path, {recursive: true}, moduleListener)
  }
}

export default async function(options) {
  global.processOptions = options
  console.log(colors.bold('\nOrionjs App\n'))

  if (!process.env.MONGO_URL) {
    try {
      await startDB()
      console.log(colors.bold(`=> Database started`))
    } catch (error) {
      console.log(colors.bold(`=> Error starting database`))
      console.log(error.message)
      return
    }
  }

  const success = await compileAll()
  if (success) {
    await run()
  }
  watch()
}
