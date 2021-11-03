import {JobsNotInitializedError} from './errors/JobsNotInitialized'
import {JobsAlreadyInitializedError} from './errors/JobsAlreadyInitialized'
import {Agenda} from 'agenda/es'

export class JobManagerContainer {
  private agenda: Agenda | void
  public state: 'started' | 'stopped' = 'stopped'

  public init(agenda: Agenda) {
    if (this.agenda) {
      throw new JobsAlreadyInitializedError()
    }
    this.agenda = agenda
  }

  public async start() {
    if (this.state === 'started') {
      console.warn('jobs.start() called on an already started Job scheduler. Skipping operation...')
      return
    }
    await this.getAgenda().start()
    this.state = 'started'
  }

  public async stop() {
    if (this.state === 'stopped') {
      console.warn('jobs.stop() called on an already stopped Job scheduler. Skipping operation...')
      return
    }
    await this.getAgenda().stop()
    this.state = 'stopped'
  }

  public getAgenda(): Agenda {
    if (!this.agenda) {
      throw new JobsNotInitializedError()
    }

    return this.agenda
  }
}

export const JobManager = new JobManagerContainer()
