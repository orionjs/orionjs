import {getConfig} from '../../env/add/getConfig'
import writeFile from '../../helpers/writeFile'
import {Runner} from '../runner'
import chokidar from 'chokidar'
import colors from 'colors/safe'

export const watchEnvFile = async (runner: Runner) => {
  if (!runner.envPath) return

  const filePath = runner.envPath

  chokidar.watch(filePath, {ignoreInitial: true}).on('change', async () => {
    writeEnvFile({
      envPath: runner.envPath,
      basePath: runner.basePath
    })
    console.log(colors.bold(`=> Environment file changed. Restarting...`))
    runner.restart()
  })
}

export const writeEnvFile = async ({basePath, envPath}) => {
  const filePath = `${basePath}/env.js`

  if (!envPath) {
    writeFile(filePath, `global.__orion_env = null`)
    return
  }

  const config = getConfig(envPath)
  const configJSON = JSON.stringify(config, null, 2)

  writeFile(filePath, `global.__orion_env = ${configJSON}`)
}
