import watchProject from './watchProject'
import defer from './defer'
import compileAll from './compileAll'
import colors from 'colors/safe'
import watchModules from './watchModules'
import run from './run'

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

export default function() {
  watchProject(function(path) {
    if (!hasChanges) console.log('')
    hasChanges = true
    console.log(colors.bold(`=> File changed -- ${path} -- restarting`))
    onAppChange()
  })

  watchModules(function() {
    if (!hasChanges) console.log('')
    hasChanges = true
    console.log(colors.bold(`=> Modules updated -- restarting`))
    onDependencyChange()
  })
}
