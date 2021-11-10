export default function ({legacy}: {legacy: boolean}): string {
  if (legacy)
    return `import {job} from '@orion-js/jobs'
import moment from 'moment'
        
export default job({
  type: 'recurrent',
  getNextRun: () => moment().add(10, 'seconds').toDate(),
  async run(params) {
  }
})`

  return `import {job} from '@orion-js/jobs'
import Examples from '../collections/Examples'

export default job({
  type: 'recurrent',
  runEvery: '1 minute',
  run: async () => {
    await Examples.findOneAndUpdate(
      {name: 'job'},
      {$inc: {counter: 1}},
      {
        mongoOptions: {
          upsert: true
        }
      }
    )
  }
})`
}
