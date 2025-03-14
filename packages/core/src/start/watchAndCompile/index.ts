import {spawn} from 'node:child_process'
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
  const child = spawn('tsx', ['watch', 'app/index.ts'], {
    cwd: process.cwd(),
    env: process.env,
    gid: process.getgid(),
    uid: process.getuid(),
    stdio: 'inherit',
  })

  child.on('error', _ => {
    process.exit(1)
  })

  child.on('exit', code => {
    if (code !== 0) {
      process.exit(code || 1)
    }
  })
}
