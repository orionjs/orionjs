import echo from '../echo'
import config from '../config'

export default echo({
  async resolve(params) {
    const promiseEvents = config.promiseMap.get(params.requestId)
    if (!promiseEvents) return

    promiseEvents.resolve(params.response)
  }
})
