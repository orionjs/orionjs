import sleep from '../helpers/sleep'
import loop from './loop'
import {setOnExit} from '@orion-js/app'
import DeamonStats from './DeamonStats'

export default async function runAgain({jobs, workers, enableStats}) {
  let exited = false
  let currentLoop = null

  setOnExit(async () => {
    exited = true

    if (currentLoop) {
      await currentLoop
    }
  })

  const stats = new DeamonStats()

  if (enableStats) stats.start()

  while (!exited) {
    currentLoop = loop({jobs, workers})

    const delay = await currentLoop
    if (delay) {
      await sleep(delay)
    }
  }
  stats.stop()
}
