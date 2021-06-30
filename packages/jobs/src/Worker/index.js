import lockConfig from '../lockConfig'
import JobsCollection from '../JobsCollection'
import {config} from '@orion-js/app'

export default class Worker {
  constructor({index}) {
    this.index = index
  }

  async close() {
    const {logger} = config()
    if (this.jobData) {
      const waitingJobData = this.jobData
      logger.info('Waiting for job to finish...', waitingJobData)
      await this.currentExecution
      logger.info('Job finished', waitingJobData)
    }
  }

  itsFree() {
    return !this.jobData
  }

  hearbeat({initTime, jobData}) {
    const {logger} = config()
    const now = new Date()
    const elapsedTime = Math.floor((now.getTime() - initTime.getTime()) / 1000)
    if (elapsedTime > lockConfig.lockTimeoutAlert * 60)
      logger.warn(
        `Job ${jobData.job} id:${jobData._id} is taking too long to complete: ${elapsedTime}s`
      )
    JobsCollection.updateOne(
      {_id: jobData._id, lockedAt: {$ne: null}},
      {$set: {lockedAt: now}}
    ).catch(error => {
      logger.error('Error on hearbeat ', error)
    })
  }

  async execute(func, jobData) {
    await this.currentExecution
    this.currentExecution = this.executeWrap(func, jobData)
  }

  async executeWrap(func, jobData) {
    this.jobData = jobData
    const initTime = new Date()
    const intervalId = setInterval(
      () => this.hearbeat({jobData, initTime}),
      lockConfig.lockRenewInterval * 1000 * 60
    )
    await func()
    clearInterval(intervalId)
    this.jobData = null
  }
}
