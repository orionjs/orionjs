import {JobManager} from '../JobManager'

export async function stop() {
  await JobManager.stop()
}
