import {Runner} from '../runner'
import cleanDirectory from './cleanDirectory'
import {ensureConfigComplies} from './ensureConfigComplies'
import {getConfigPath} from './getConfigPath'
import {watchDeletes} from './watchDeletes'
import {watchEnvFile} from './writeEnvFile'

export default async function watchAndCompile(runner: Runner) {
  const configPath = getConfigPath()
  ensureConfigComplies(configPath)

  await cleanDirectory()
  watchDeletes()
  watchEnvFile(runner)
}
