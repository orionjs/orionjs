import sleep from '../helpers/sleep'
import processExists from 'process-exists'

export default async function() {
  if (!global.appProcess) return
  const pid = global.appProcess.pid
  for (let i = 0; true; i++) {
    // console.log('checking if killed', await processExists(pid))
    if (!(await processExists(pid))) {
      return
    }

    await sleep(100)
    // 60 secs
    if (i > 10 * 60) {
      return
    }
  }
}
