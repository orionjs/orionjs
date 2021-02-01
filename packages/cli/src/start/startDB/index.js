import {spawn} from 'child_process'
import colors from 'colors/safe'
import ensureDirectory from '../../helpers/ensureDirectory'
import sleep from '../../helpers/sleep'

export default async function () {
  ensureDirectory('.orion/db/logs/mongolog.log')
  ensureDirectory('.orion/db/data/file.txt')

  const appPort = process.env.PORT || 3000
  const dbPort = Number(appPort) + 1
  const args = `--dbpath=.orion/db/data --port=${dbPort} --logpath .orion/db/logs/mongolog.log`.split(
    ' '
  )

  const dbProcess = await new Promise(async function (resolve, reject) {
    let error = false

    const dbProcess = spawn('mongod', args, {
      cwd: process.cwd(),
      detached: false
    })

    dbProcess.stderr.on('data', data => {
      console.error(data.toString())
    })

    dbProcess.on('close', code => {
      if (code !== 0) {
        error = true
        console.log(colors.bold('=> Error running database'))
        console.log(colors.bold('=> Check .orion/db/logs/mongolog.log for more information'))
      }
    })

    await sleep(2000)
    if (!error) {
      resolve(dbProcess)
    }
  })

  dbProcess.on('exit', function (code, signal) {
    if (code === 0 || signal === 'SIGTERM') {
    } else {
      console.log(colors.bold('\n=> Error running database'))
    }
  })

  global.localMongoURI = `mongodb://127.0.0.1:${dbPort}/orionlocal`
}
