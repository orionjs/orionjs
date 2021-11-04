import {JobScheduleRequiredError} from '../errors/JobScheduleRequired'
import {Agenda, Job as AgendaJob} from 'agenda/es'
import {Processor} from 'agenda/dist/agenda/define'
import {JobDefinition, JobMap, Job} from '../types/job'
import {getAgendaOptions} from '../utils/getAgendaOptions'
import getProcessorFromJob from '../utils/getProcessorFromJob'
import getJobName from '../utils/getJobName'

const transformRunPeriodToAgenda = (job: JobDefinition): string => {
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
      (jobs[key] as Job).__initialize ? (jobs[key] as Job).__initialize(key) : jobs[key]
    ) as JobDefinition
    const jobName = getJobName(job.name ?? key)

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
    if (job.type === 'single') {
      // Do nothing, event jobs are defined on call (see /job/index.ts)
      return
    }
  })

  await Promise.all(promises)
}
