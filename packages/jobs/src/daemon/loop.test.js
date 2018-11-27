import range from 'lodash/range'
import loop from './loop'
import JobsCollection from '../JobsCollection'
import job from '../job'
import Worker from '../Worker'
import initJobs from '../initJobs'
import {sleep} from '@orion-js/app'

const workers = range(1).map(index => new Worker({index}))

it("should run a event job if it's in line", async () => {
  expect.assertions(1)
  await JobsCollection.await()

  await new Promise(async resolve => {
    const aJob = job({
      type: 'event',
      run: async params => {
        expect(params.name).toBe('Nicolás')
        resolve()
      }
    })

    const jobs = await initJobs({aJob})

    await aJob({name: 'Nicolás'})
    loop({jobs, workers, runLoop: () => {}})
  })
})

it("should run a recurrent job if it's in line", async () => {
  expect.assertions(3)
  await JobsCollection.await()

  await new Promise(async resolve => {
    let count = 0
    const aJob = job({
      type: 'recurrent',
      runEvery: 1,
      run: async () => {
        count++
        expect(1).toBe(1)
        if (count === 3) {
          resolve()
        }
      }
    })

    const jobs = await initJobs({aJob})

    await sleep(10)

    loop({
      jobs,
      workers,
      runLoop: async () => {
        await sleep(10)
        // run 2
        loop({
          jobs,
          workers,
          runLoop: async () => {
            await sleep(10)
            // run 3
            loop({jobs, workers, runLoop: () => {}})
          }
        })
      }
    })
  })
})
