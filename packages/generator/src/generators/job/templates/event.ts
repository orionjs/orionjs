export default function ({legacy}: {legacy: boolean}): string {
  if (!legacy) throw new Error("event jobs doesn't exist in Orionjs v3, you must use 'single'")
  return `import {job} from '@orion-js/jobs'

    export default job({
      type: 'event',
      async run(params) {
      }
    })`
}
