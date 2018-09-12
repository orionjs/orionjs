import isPortInUse from '../helpers/isPortInUse'
import sleep from '../helpers/sleep'

const arePortsInUse = async function() {
  const port = process.env.PORT || 3000
  if (await isPortInUse(port)) return true

  if (global.processOptions.shell) {
    if (await isPortInUse(9229)) return true
  }

  return false
}

export default async function() {
  for (let i = 0; await arePortsInUse(); i++) {
    await sleep(10)
    // 5 secs
    if (i > 100) {
      return false
    }
  }
  return true
}
