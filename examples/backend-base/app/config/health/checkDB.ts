import {getMongoConnection} from '@orion-js/mongodb'
import {jobsRepo} from '@orion-js/dogs'

export async function checkDB() {
  const connection = getMongoConnection({name: 'main'})
  await connection.connectionPromise

  await jobsRepo.jobs.findOne()
}
