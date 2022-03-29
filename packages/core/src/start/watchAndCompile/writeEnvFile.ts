import {getConfig} from '../../env/add/getConfig'
import writeFile from '../../helpers/writeFile'
import {Runner} from '../runner'
import chokidar from 'chokidar'
import colors from 'colors/safe'
import readFile from '../../helpers/getFileContents'

export const watchEnvFile = async (runner: Runner) => {
  if (!runner.envPath) return

  const filePath = runner.envPath

  chokidar.watch(filePath, {ignoreInitial: true}).on('change', async () => {
    writeEnvFile({
      envPath: runner.envPath,
      basePath: runner.basePath,
      createDtsFile: true
    })
    console.log(colors.bold(`=> Environment file changed. Restarting...`))
    runner.restart()
  })
}

export const getDts = config => {
  const keys = [...Object.keys(config.cleanKeys), ...Object.keys(config.encryptedKeys)]
  return `declare module '@orion-js/env' {
  export const env: {
${keys.map(key => `    ${key}: string;`).join('\n')}
  }
}
`
}

export const writeEnvFile = async ({basePath, envPath, createDtsFile}) => {
  const filePath = `${basePath}/env.js`

  if (!envPath) {
    writeFile(filePath, `global.__orion_env__ = null`)
    return
  }

  const config = getConfig(envPath)
  const configJSON = JSON.stringify(config, null, 2)

  if (createDtsFile) {
    const currentFile = readFile('./app/env.d.ts')
    const dts = getDts(config)
    if (currentFile !== dts) {
      writeFile('./app/env.d.ts', dts)
    }
  }

  writeFile(filePath, `global.__orion_env__ = ${configJSON}`)
}
