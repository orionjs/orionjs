export default function ({legacy}: {legacy: boolean}): string {
  if (legacy) throw new Error("single jobs doesn't exist in orion v2, you must use 'event'")

  return `import {job} from '@orion-js/jobs'
import Examples from '../collections/Examples'

export default job({
  type: 'single',
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
