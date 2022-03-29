import {generateId} from '@orion-js/helpers'
import createCollection from '.'

export const MockTests = createCollection({
  name: generateId(),
  indexes: [{keys: {a: 1}, options: {unique: true}}]
})
