import clean from './index'

test('autoconverts values', async () => {
  const schema = {
    number: {
      type: Number
    },
    string: {
      type: String
    },
    string2: {
      type: String
    }
  }
  const doc = {
    number: '12',
    string: 12,
    string2: 'string '
  }
  const cleaned = await clean(schema, doc)
  expect(cleaned).toEqual({
    number: 12,
    string: '12',
    string2: 'string'
  })
})

test('dont autoConvert values', async () => {
  const schema = {
    number: {
      type: 'number'
    },
    string: {
      type: String
    },
    string2: {
      type: String
    }
  }
  const doc = {
    number: '12',
    string: 12,
    string2: 'string '
  }
  const cleaned = await clean(schema, doc, {autoConvert: false, trimStrings: false})
  expect(cleaned).toEqual({
    number: '12',
    string: 12,
    string2: 'string '
  })
})

test('cleans boolean correctly', async () => {
  const type = {type: Boolean}
  const schema = {
    a: type,
    b: type,
    c: type,
    d: type,
    e: type
  }
  const doc = {
    a: 1,
    b: 'true',
    c: 0,
    d: true,
    e: 'false',
    f: true
  }
  const cleaned = await clean(schema, doc)
  expect(cleaned).toEqual({
    a: true,
    b: true,
    c: false,
    d: true,
    e: false
  })
})

test('trims strings and filter them', async () => {
  const type = {type: String}
  const schema = {
    aString: type,
    otherString: type
  }
  const doc = {
    aString: ' 123 321 \n 123 \n\t d\t',
    otherString: ' '
  }
  const cleaned = await clean(schema, doc)
  expect(cleaned).toEqual({
    aString: '123 321 \n 123 \n\t d'
  })
})

test('filter fields not in schema', async () => {
  const type = {type: String}
  const schema = {
    a: type,
    b: type
  }
  const doc = {
    b: 'hi',
    c: 'hello'
  }
  const cleaned = await clean(schema, doc)
  expect(cleaned).toEqual({
    b: 'hi'
  })
})
