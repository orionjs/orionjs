import {
  Collection,
  ModelToDocumentTypeWithoutId,
  MongoCollection,
  Repository,
} from '@orion-js/mongodb'
import {omit} from 'lodash'
import {HistoryRecord} from '../types/HistoryRecord'
import {getModelForClass} from '@orion-js/typed-model'

@Repository()
export class JobsHistoryRepo {
  @MongoCollection({
    name: 'orionjs.jobs_dogs_history',
    idGeneration: 'uuid',
    schema: getModelForClass(HistoryRecord),
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

  async saveExecution(record: ModelToDocumentTypeWithoutId<HistoryRecord>) {
    await this.history.upsert(
      {executionId: record.executionId},
      {
        $setOnInsert: {
          status: record.status,
        },
        $set: {
          ...omit(record, 'status'),
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
