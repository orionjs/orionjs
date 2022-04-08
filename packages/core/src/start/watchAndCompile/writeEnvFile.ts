import writeFile from '../../helpers/writeFile'
import {Runner} from '../runner'
import chokidar from 'chokidar'
import colors from 'colors/safe'
import readFile from '../../helpers/getFileContents'
import {readEnv} from '@orion-js/env'

const envFilePath = process.env.ORION_ENV_FILE_PATH

export const watchEnvFile = async (runner: Runner) => {
  if (!envFilePath) return

  writeDtsFile()

  chokidar.watch(envFilePath, {ignoreInitial: true}).on('change', async () => {
    console.log(colors.bold(`=> Environment file changed. Restarting...`))
    writeDtsFile()
    runner.restart()
  })
}

export const getDts = () => {
  const keys = Object.keys(readEnv())
  return `declare module '@orion-js/env' {
  export const env: {
${keys.map(key => `    ${key}: string;`).join('\n')}
  }
}
`
}

export const writeDtsFile = async () => {
  const currentFile = readFile('./app/env.d.ts')
  const dts = getDts()
  if (currentFile !== dts) {
    writeFile('./app/env.d.ts', dts)
  }
}
