import {route} from '@orion-js/http'

export default route({
  path: '/',
  method: 'get',
  async resolve() {
    return {
      body: 'Hello world',
    }
  },
})
