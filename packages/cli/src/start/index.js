import compileAll from './compileAll'
import run from './run'
import colors from 'colors/safe'
import startDB from './startDB'
import watch from './watch'
import has from 'lodash/has'

export default async function(options) {
  global.processOptions = options
  console.log(colors.bold('\nOrionjs App\n'))

  if (!has(process.env, 'MONGO_URL')) {
    try {
      await startDB()
      console.log(colors.bold(`=> Database started`))
    } catch (error) {
      console.log(colors.bold(`=> Error starting database`))
      console.log(error.message)
      return
    }
  }

  const success = await compileAll(options)
  if (success) {
    await run()
  }
  watch()
}
