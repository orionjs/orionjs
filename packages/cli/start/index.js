import fs from 'fs'
import compileAll from './compileAll'
import run from './run'
import colors from 'colors/safe'

let hasChanges = true
let app = null

const runApp = function() {
  if (app) app.kill()
  app = run({restart: runApp})
  console.log(colors.bold('=> App started\n'))
}

const start = async function() {
  if (!hasChanges) return
  hasChanges = false

  console.log(colors.bold('=> Compiling...'))
  const result = await compileAll()
  if (!result) return
  runApp()
}

setInterval(start, 1000)

const watch = function() {
  fs.watch('./app', {recursive: true}, function(event, file) {
    if (!hasChanges) console.log('')
    hasChanges = true
    console.log(colors.bold(`=> File changed -- ${file} -- restarting`))
  })
}

export default function() {
  console.log(colors.bold('\nOrionjs App\n'))
  start()
  watch()
}
