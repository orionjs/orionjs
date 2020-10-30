import child_process from 'child_process'
import path from 'path'
import slice from 'lodash/slice'

export default async function (program) {
  const jestPath = path.resolve(__dirname, '../../node_modules/.bin/jest')
  const args = slice(program.parent.rawArgs, 3)
  const testsPath = path.resolve(process.cwd(), './app')
  args.unshift(testsPath)

  args.push('--forceExit')

  // console.log('jest ' + args.join(' '))
  const child = child_process.spawn(jestPath, args, {
    stdio: 'inherit',
    env: {
      ORION_DEV: 'local',
      ORION_TEST: 1,
      ...process.env
    }
  })

  child.on('exit', function (code) {
    process.exit(code)
  })
}
