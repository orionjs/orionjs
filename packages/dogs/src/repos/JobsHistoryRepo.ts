import {createCollection, ModelToDocumentTypeWithoutId} from '@orion-js/mongodb'
import {Service} from '@orion-js/services'
import {omit} from 'lodash'
import {HistoryRecord} from '../types/HistoryRecord'

@Service()
export class JobsHistoryRepo {
  public history = createCollection<HistoryRecord>({
    name: 'orionjs.jobs_dogs_history',
    model: HistoryRecord,
    indexes: [
      {
        keys: {
          jobName: 1,
          startedAt: 1
        }
      },
      {
        keys: {
          expiresAt: 1
        },
        options: {
          expireAfterSeconds: 0
        }
      }
    ]
  })

  async saveExecution(record: ModelToDocumentTypeWithoutId<HistoryRecord>) {
    await this.history.upsert(
      {executionId: record.executionId},
      {
        $setOnInsert: {
          status: record.status
        },
        $set: {
          ...omit(record, 'status')
        }
      }
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
