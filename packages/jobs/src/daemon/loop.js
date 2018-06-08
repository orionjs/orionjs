import sleep from '../helpers/sleep'

export default async function loop() {
  console.log('running job loop')
  const jobToRun = null
  if (/* no job to run */ !jobToRun) {
    await sleep(1000)
  }
  process.nextTick(loop)
}
