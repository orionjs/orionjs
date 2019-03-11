import {spawn} from 'child_process'
import colors from 'colors/safe'
import ensureDirectory from '../../helpers/ensureDirectory'
import sleep from '../../helpers/sleep'
import fs from 'fs'
import waitAppStopped from '../waitAppStopped'
import {setOnExit} from '../../helpers/onExit'

export default async function() {
  ensureDirectory('.orion/db/logs/mongolog.log')
  ensureDirectory('.orion/db/data/file.txt')

  const appPort = process.env.PORT || 3000
  const dbPort = appPort + 1
  const args = `--dbpath=.orion/db/data --port=${dbPort} --logpath .orion/db/logs/mongolog.log`.split(
    ' '
  )

  const dbProcess = await new Promise(async function(resolve, reject) {
    let error = false
    const dbProcess = spawn(
      'mongod',
      args,
      {
        cwd: process.cwd(),
        detached: true
      },
      function(error, stdout, stderr) {
        console.error(stderr)
        if (error) {
          const logs = fs.readFileSync('.orion/db/logs/mongolog.log')
          reject(new Error(logs))
          error = true
        }
      }
    )
    await sleep(2000)
    if (!error) {
      resolve(dbProcess)
    }
  })

  dbProcess.on('exit', function(code, signal) {
    if (code === 0 || signal === 'SIGTERM') {
    } else {
      console.log(colors.bold('\n=> Error running database'))
    }
  })

  setOnExit(async () => {
    await waitAppStopped()
    console.log(colors.bold('\n=> Stopping database...'))
    dbProcess.kill()
  })

  global.localMongoURI = `mongodb://127.0.0.1:${dbPort}/orionlocal`
}
