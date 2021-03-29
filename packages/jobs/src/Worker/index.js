import {setOnExit} from '@orion-js/app'
import lockConfig from '../lockConfig'
import JobsCollection from '../JobsCollection'
import {config} from '@orion-js/app'

export default class Worker {
  constructor({index}) {
    this.index = index
    setOnExit(() => this.onExit())
  }

  async onExit() {
    if (this.currentExecution) {
      await this.currentExecution
    }
  }

  itsFree() {
    return !this.currentExecution
  }

  hearbeat() {
    const {logger} = config()
    const now = new Date()
    const elapsedTime = Math.floor((now.getTime() - this.currentInitTime.getTime()) / 1000)
    if (elapsedTime > lockConfig.lockTimeoutAlert * 60)
      logger.warn(
        `Job ${this.currentJobData.job} id:${this.currentJobData._id} is taking too long to complete: ${elapsedTime}s`
      )
    JobsCollection.updateOne(
      {_id: this.currentJobData._id, lockedAt: {$ne: null}},
      {$set: {lockedAt: now}}
    ).catch(error => {
      logger.error('Error on hearbeat ', error)
    })
  }

  async execute(func, jobData) {
    this.currentJobData = jobData
    this.currentInitTime = new Date()
    this.interval = setInterval(() => this.hearbeat(), lockConfig.lockRenewInterval * 1000 * 60)
    this.currentExecution = func()
    await this.currentExecution
    if (this.interval) clearInterval(this.interval)
    this.currentJobData = null
    this.currentExecution = null
  }
}
