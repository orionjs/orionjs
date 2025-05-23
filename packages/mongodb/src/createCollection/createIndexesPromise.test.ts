import {generateId} from '@orion-js/helpers'
import {createCollection} from '.'
import {describe, it, expect, beforeEach} from 'vitest'

const Tests = createCollection({
  name: generateId(),
  indexes: [{keys: {a: 1}, options: {unique: true}}],
})

beforeEach(async () => {
  await Tests.startConnection()
})

describe('createIndexesPromise', () => {
  it('should correctly handle the promise for tests', async () => {
    const userId = await Tests.insertOne({
      name: 'Nico',
    })
    const user = await Tests.findOne(userId)
    expect(user.name).toBe('Nico')
  })

  it('should be able to close the index handlers on the global config', async () => {
    createCollection({
      name: generateId(),
      indexes: [{keys: {a: 1}, options: {unique: true}}],
    })
  })
})
