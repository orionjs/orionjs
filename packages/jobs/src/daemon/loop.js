import sleep from '../helpers/sleep'
import getJobToRun from './getJobToRun'
import getFreeWorker from './getFreeWorker'
import createJobExecutor from './createJobExecutor'

const loop = async function({jobs, workers}) {
  const freeWorker = getFreeWorker(workers)
  if (!freeWorker) {
    return runLoop({jobs, workers}, 100)
  }

  const jobData = await getJobToRun()
  if (!jobData) {
    return runLoop({jobs, workers}, 1000)
  }

  const func = createJobExecutor({jobData, jobs})
  freeWorker.execute(func)

  console.log(`will execute job ${jobData.job} in worker ${freeWorker.index}`)

  return runLoop({jobs, workers})
}

const runLoop = async function({jobs, workers}, delay) {
  if (delay) {
    await sleep(delay)
  }
  process.nextTick(() => loop({jobs, workers}))
}

export default runLoop
