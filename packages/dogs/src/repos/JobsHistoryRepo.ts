import {Collection, MongoCollection, Repository, MongoDB} from '@orion-js/mongodb'
import {omit} from 'rambdax'
import {HistoryRecord, HistoryRecordSchema} from '../types/HistoryRecord'

@Repository()
export class JobsHistoryRepo {
  @MongoCollection({
    name: 'orionjs.jobs_dogs_history',
    idGeneration: 'uuid',
    schema: HistoryRecordSchema,
    indexes: [
      {
        keys: {
          jobName: 1,
          startedAt: 1,
        },
      },
      {
        keys: {
          executionId: 1,
        },
      },
      {
        keys: {
          expiresAt: 1,
        },
        options: {
          expireAfterSeconds: 0,
        },
      },
    ],
  })
  history: Collection<HistoryRecord>

  async saveExecution(record: MongoDB.WithoutId<HistoryRecord>) {
    await this.history.upsert(
      {executionId: record.executionId},
      {
        $setOnInsert: {
          status: record.status,
        },
        $set: {
          ...omit(['status'], record),
        },
      },
    )
  }

  async getExecutions(jobName: string, limit?: number, skip?: number): Promise<HistoryRecord[]> {
    const cursor = this.history.find({jobName}).sort({startedAt: -1})

    if (skip) {
      cursor.skip(skip)
    }

    if (limit) {
      cursor.limit(limit)
    }

    return await cursor.toArray()
  }
}
