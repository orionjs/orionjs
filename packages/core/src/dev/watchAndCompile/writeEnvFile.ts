import {writeDtsFileFromConfigFile} from '@orion-js/env'
import chalk from 'chalk'
import chokidar from 'chokidar'
import {Runner} from '../runner'

const envFilePath = process.env.ORION_ENV_FILE_PATH
const dtsFilePath = './app/env.d.ts'

export const watchEnvFile = async (runner: Runner) => {
  if (!envFilePath) return

  writeDtsFileFromConfigFile(envFilePath, dtsFilePath)

  chokidar.watch(envFilePath, {ignoreInitial: true}).on('change', async () => {
    console.log(chalk.bold('=> Environment file changed. Restarting...'))
    writeDtsFileFromConfigFile(envFilePath, dtsFilePath)
    runner.restart()
  })
}
