import start from './start'
import Jobs from './JobsCollection'
import job from './job'
import Daemon from './daemon'

const stop = () => Daemon.stop()

export {start, Jobs, job, stop}
