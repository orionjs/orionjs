import sleep from '../../helpers/sleep'

let running = true

const collect = async function() {
  const store = global.orionjsCache

  const now = new Date().getTime()
  for (const key of Object.keys(store)) {
    const data = store[key]
    if (data.expires < now) {
      delete store[key]
    }
  }

  if (running) {
    await sleep(300)
    setImmediate(collect)
  }
}

export default function(stop) {
  if (stop) {
    running = false
  } else {
    collect()
  }
}
