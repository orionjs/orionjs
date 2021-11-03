import {JobManager} from '../JobManager'

export async function start() {
  if (process.env.ORION_TEST) {
    console.log('Skipping jobs.start(). ORION_TEST env var or disabled option is set.')
    return
  }

  await JobManager.start()
}
