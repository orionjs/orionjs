import getFieldLabels from './getFieldLabels'
import getValidationErrors from './index'
import Errors from '../Errors'
import {test, expect} from 'vitest'

test('extracts field labels from a simple schema', () => {
  const schema = {
    name: {
      type: String,
      label: 'Full Name',
    },
    age: {
      type: Number,
      label: 'Age in Years',
    },
    email: {
      type: String,
      // no label
    },
  }

  const labels = getFieldLabels(schema)
  expect(labels).toEqual({
    name: 'Full Name',
    age: 'Age in Years',
  })
})

test('extracts field labels from nested schemas', () => {
  const address = {
    street: {
      type: String,
      label: 'Street Address',
    },
    city: {
      type: String,
      label: 'City Name',
    },
  }

  const schema = {
    name: {
      type: String,
      label: 'Full Name',
    },
    address: {
      type: address,
      label: 'Home Address',
    },
  }

  const labels = getFieldLabels(schema)
  expect(labels).toEqual({
    name: 'Full Name',
    address: 'Home Address',
    'address.street': 'Street Address',
    'address.city': 'City Name',
  })
})

test('extracts field labels from array schemas', () => {
  const tag = {
    name: {
      type: String,
      label: 'Tag Name',
    },
    color: {
      type: String,
      label: 'Tag Color',
    },
  }

  const schema = {
    title: {
      type: String,
      label: 'Article Title',
    },
    tags: {
      type: [tag],
      label: 'Article Tags',
    },
  }

  const labels = getFieldLabels(schema)
  expect(labels).toEqual({
    title: 'Article Title',
    tags: 'Article Tags',
    'tags.name': 'Tag Name',
    'tags.color': 'Tag Color',
  })
})

test('handles empty schemas', () => {
  const labels = getFieldLabels({})
  expect(labels).toEqual({})
})

test('getValidationErrors returns both validation errors and field labels', async () => {
  const schema = {
    firstName: {
      type: String,
      label: 'First Name',
    },
    lastName: {
      type: String,
      label: 'Last Name',
    },
    age: {
      type: Number,
      label: 'Age in Years',
    },
  }

  const result = await getValidationErrors(schema, {
    lastName: 'López',
    // missing firstName and age
  } as any)

  expect(result).toEqual({
    firstName: Errors.REQUIRED,
    age: Errors.REQUIRED,
  })

  const labels = getFieldLabels(schema)

  expect(labels).toEqual({
    firstName: 'First Name',
    lastName: 'Last Name',
    age: 'Age in Years',
  })
})
