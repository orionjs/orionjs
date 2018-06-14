import {exec} from 'child_process'
import colors from 'colors/safe'
import ensureDirectory from '../../helpers/ensureDirectory'
import sleep from '../../helpers/sleep'
import fs from 'fs'
import onExit from '../../helpers/onExit'

export default async function() {
  ensureDirectory('.orion/db/logs/mongolog.log')
  ensureDirectory('.orion/db/data/file.txt')

  const appPort = process.env.PORT || 3000
  const dbPort = appPort + 1
  const command = `mongod --dbpath=.orion/db/data --port=${dbPort} --logpath .orion/db/logs/mongolog.log`

  const dbProcess = await new Promise(async function(resolve, reject) {
    let error = false
    const dbProcess = exec(command, {}, function(error, stdout, stderr) {
      console.error(stderr)
      if (error) {
        const logs = fs.readFileSync('.orion/db/logs/mongolog.log')
        reject(new Error(logs))
        error = true
      }
    })
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

  onExit(() => {
    console.log(colors.bold('\n=> Stopping database...'))
    dbProcess.kill()
  })

  global.localMongoURI = `mongodb://127.0.0.1:${dbPort}/orionlocal`
}
