import watchProject from './watchProject'
import defer from '../defer'
import watchModules from './watchModules'
import run from '../run'

const onChange = defer(async function() {
  await run()
}, 100)

export default function() {
  watchProject(onChange)

  watchModules(onChange)
}
