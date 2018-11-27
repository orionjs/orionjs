import sleep from '../helpers/sleep'
import loop from './loop'

export default async function runLoop({jobs, workers}, delay) {
  if (delay) {
    await sleep(delay)
  }
  process.nextTick(() => loop({jobs, workers, runLoop}))
}
