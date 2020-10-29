import child_process from 'child_process'
import path from 'path'
import slice from 'lodash/slice'
import startDB from './startDB'

export default async function (program) {
  const jestPath = path.resolve(__dirname, '../../node_modules/.bin/jest')
  const args = slice(program.parent.rawArgs, 3)
  const testsPath = path.resolve(process.cwd(), './app')
  args.unshift(testsPath)

  args.push('--forceExit')

  // console.log('jest ' + args.join(' '))
  const {uri, mongod} = await startDB()
  const child = child_process.spawn(jestPath, args, {
    stdio: 'inherit',
    env: {
      MONGO_URL: uri,
      ORION_DEV: 'local',
      ORION_TEST: 1,
      ...process.env
    }
  })

  child.on('exit', function (code) {
    mongod.stop()
    process.exit(code)
  })
}
