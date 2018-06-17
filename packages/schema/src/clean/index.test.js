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

test('runs autovalues with arrays', async () => {
  const schema = {
    texts: {
      type: [String],
      autoValue(values) {
        return values.map(val => val + ' world')
      }
    }
  }
  const doc = {
    texts: ['hello', 'good bye']
  }
  const cleaned = await clean(schema, doc)
  expect(cleaned).toEqual({
    texts: ['hello world', 'good bye world']
  })
})

test('run autovalue when field is not present', async () => {
  const schema = {
    text: {
      type: String,
      autoValue(values) {
        return 'a value'
      }
    }
  }
  const doc = {}
  const cleaned = await clean(schema, doc)
  expect(cleaned).toEqual({text: 'a value'})
})

test('returns the default values', async () => {
  const schema = {
    text: {
      type: String,
      defaultValue: 'hello',
      autoValue(value) {
        return value + ' world'
      }
    },
    text1: {
      type: String,
      defaultValue: 'text1'
    },
    text2: {
      type: String,
      defaultValue: 'text2'
    },
    text3: {
      type: String
    },
    text4: {
      type: String,
      defaultValue() {
        return 'afunc'
      }
    }
  }
  const doc = {text1: 'pass'}
  const cleaned = await clean(schema, doc)
  expect(cleaned).toEqual({
    text: 'hello world',
    text1: 'pass',
    text2: 'text2',
    text4: 'afunc'
  })
})

test('run deep autovalues', async () => {
  const deep = {
    s: {
      type: String,
      autoValue() {
        return 'no'
      }
    }
  }
  const schema = {
    text: {
      type: deep,
      autoValue(text) {
        return {...text, type: 'text'}
      }
    },
    texts: {
      type: [deep],
      autoValue(texts) {
        return [texts[0], 'yes']
      }
    }
  }
  const doc = {
    text: {s: 'objecttext'},
    texts: [{s: 'arraytext'}, {s: 'noa'}]
  }
  const cleaned = await clean(schema, doc)
  expect(cleaned).toEqual({
    text: {s: 'no', type: 'text'},
    texts: [{s: 'no'}, 'yes']
  })
})

test('perform custom cleaning', async () => {
  const person = {
    name: {
      type: String
    },
    async __clean(value) {
      if (value.name === 'Joaquin') {
        return {name: 'Roberto'}
      } else {
        return value
      }
    }
  }

  const schema = {
    persons: {
      type: [person]
    }
  }

  const cleaned = await clean(schema, {
    persons: [{name: 'Nicolás'}, {name: 'Joaquin'}]
  })
  expect(cleaned).toEqual({
    persons: [{name: 'Nicolás'}, {name: 'Roberto'}]
  })
})

test('perform non deep custom cleaning', async () => {
  const schema = {
    name: {
      type: String
    },
    async __clean(value) {
      if (value.name === 'Joaquin') {
        return {name: 'Roberto'}
      } else {
        return value
      }
    }
  }

  const cleaned = await clean(schema, {name: 'Joaquin'})
  expect(cleaned).toEqual({name: 'Roberto'})
})
