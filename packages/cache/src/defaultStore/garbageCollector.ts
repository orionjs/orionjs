import {sleep} from '@orion-js/helpers'

let running = true

const collect = async function () {
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

export default function (stop?: boolean): void {
  if (stop) {
    running = false
  } else {
    collect()
  }
}
