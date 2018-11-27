import runLoop from './runLoop'
import range from 'lodash/range'
import Worker from '../Worker'

export default function({jobs, workersCount}) {
  const workers = range(workersCount).map(index => new Worker({index}))
  runLoop({jobs, workers})
}
