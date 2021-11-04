import {JobScheduleRequiredError} from '../errors/JobScheduleRequired'
import {Agenda, Job as AgendaJob} from 'agenda/es'
import {Processor} from 'agenda/dist/agenda/define'
import {Job, JobMap, JobInitializer} from '../types/job'
import {getAgendaOptions} from '../utils/getAgendaOptions'
import getProcessorFromJob from '../utils/getProcessorFromJob'

const transformRunPeriodToAgenda = (job: Job): string => {
  const {runEvery} = job
  if (runEvery) {
    if (typeof runEvery === 'number') {
      return `${runEvery} milliseconds`
    }
    return runEvery
  }
}

export default async function initJobs(agenda: Agenda, jobs: JobMap, disabled = false) {
  const promises = Object.keys(jobs).map(async key => {
    const job = (
      (jobs[key] as JobInitializer).__initialize
        ? (jobs[key] as JobInitializer).__initialize()
        : jobs[key]
    ) as Job
    const jobName = job.name ?? key

    const opts = getAgendaOptions(job)
    // Recurrent jobs
    if (job.type === 'recurrent' && job.runEvery) {
      agenda.define(jobName, opts, getProcessorFromJob(job))

      if (!disabled) await agenda.every(transformRunPeriodToAgenda(job), jobName)

      return
    } else if (job.type === 'recurrent' && job.getNextRun) {
      // Override the default job definition so that it schedules the next run before executing the job.
      const processor: Processor = async (agendaJob: AgendaJob): Promise<void> => {
        agenda.schedule(job.getNextRun(), jobName, agendaJob.attrs.data)
        const jobProcessor = getProcessorFromJob(job)
        await jobProcessor(agendaJob)
      }

      agenda.define(jobName, opts, processor)
      if (!disabled) await agenda.schedule(job.getNextRun(), jobName, {})

      return
    } else if (job.type === 'recurrent') {
      throw new JobScheduleRequiredError(jobName)
    }

    // Event jobs
    if (job.type === 'event') {
      // Do nothing, event jobs are defined on call (see /job/index.ts)
      return
    }
  })

  await Promise.all(promises)
}
