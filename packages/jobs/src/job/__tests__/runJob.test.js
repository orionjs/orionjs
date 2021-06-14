import JobsCollection from '../../JobsCollection'
import runJob from '../runJob'

describe('runJob tests', function() {
  describe('Error scenarios', function() {
    it('should throw error when job does not have identifier', async function() {
      try {
        await runJob()
      } catch (error) {
        expect(error.message).toBe('Job must be initialized in "start()" to be able to run')
      }
    }, 10000)

    it('should throws error when job.type is not "event"', async function() {
      try {
        await runJob.apply({identifier: 1, type: "otherType"}, [])
      } catch (error) {
        expect(error.message).toBe('You can only call event jobs, not otherType')
      }
    })

    it('should throw error when there is a duplicated event job and ignoreDuplicationError = false', function() {
      const jobDefinition = {identifier: 'jobIdentifierError', type: 'event'}
      const jobImplementationParams = {param: 'test'}
      const jobOptions = {identifier: 2, waitToRun: 10, ignoreDuplicationError: false}

      expect(runJob.apply(jobDefinition, [jobImplementationParams, jobOptions])).resolves.toBeTruthy()
      expect(runJob.apply(jobDefinition, [jobImplementationParams, jobOptions])).rejects.toBeTruthy()
    })
  })

  describe('Successful scenarios', function() {
    it('should insert a new job', async function() {
      const jobDefinition = {identifier: 'jobIdentifier', type: 'event'}
      const jobImplementationParams = {param: 'test'}
      const jobOptions = {identifier: 2, waitToRun: 10}

      await runJob.apply(jobDefinition, [jobImplementationParams, jobOptions])
      const jobCreated = await JobsCollection.findOne({job: jobDefinition.identifier})

      expect(jobCreated).not.toBeFalsy()
      expect(jobCreated.identifier).toBe(jobOptions.identifier.toString())
      expect(jobCreated.params).toEqual(expect.objectContaining(jobImplementationParams))
    })

    it('should not throw error when there is a duplicated event job and ignoreDuplicationError = true', function() {
      const jobDefinition = {identifier: 'jobIdentifierError', type: 'event'}
      const jobImplementationParams = {param: 'test'}
      const jobOptions = {identifier: 2, waitToRun: 10, ignoreDuplicationError: true}

      expect(runJob.apply(jobDefinition, [jobImplementationParams, jobOptions])).resolves.toBe(2)
      expect(runJob.apply(jobDefinition, [jobImplementationParams, jobOptions])).resolves.toBe(2)
    })
  })
})
