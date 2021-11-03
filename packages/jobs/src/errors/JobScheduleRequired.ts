export class JobScheduleRequiredError extends Error {
  constructor(jobName: string) {
    super(
      `Job "${jobName}" is of type "recurrent" but does not define a schedule. Include the "getNextRun" or "runEvery" property in your job definition.`
    )
  }
}
