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
    // 10 min
    if (i > 10 * 60 * 10) {
      console.log('App stop timeout')
      return
    }
  }
}
