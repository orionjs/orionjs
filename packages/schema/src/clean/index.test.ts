import {SchemaFieldTypes} from '..'
import {asSchemaNode, Schema} from '../types/schema'
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
  const schema: Schema = {
    number: {
      type: SchemaFieldTypes.Number
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

test('dont remove null values', async () => {
  const schema = {
    string: {
      type: String
    }
  }
  const doc = {
    string: null
  }
  const cleaned = await clean(schema, doc)
  expect(cleaned).toEqual({
    string: null
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
  const cleaned = await clean(schema, doc, {trimStrings: true, removeEmptyStrings: true})
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
  const schema: Schema = {
    texts: asSchemaNode<string[]>({
      type: [String],
      autoValue(values: string[]) {
        return values.map(val => val + ' world')
      }
    })
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
    text: {s: 'no'},
    texts: [{s: 'no'}, 'yes']
  })
})

test('perform custom cleaning from clean option in field', async () => {
  const person = {
    name: {
      type: String,
      async clean(value) {
        if (value === 'Joaquin') {
          return 'Roberto'
        } else {
          return value
        }
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

  // @ts-ignore TODO: Check why the __clean method is being used here instead of clean
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

  // @ts-ignore TODO: Check why the __clean method is being used here instead of clean
  const cleaned = await clean(schema, {name: 'Joaquin'})
  expect(cleaned).toEqual({name: 'Roberto'})
})

test('Handle errors while cleaning', async () => {
  const schema = {
    name: {
      type: String,
      async autoValue(value) {
        throw new Error('an error')
      }
    }
  }

  try {
    await clean(schema, {name: 'Joaquin'})
  } catch (error) {
    expect(error.message).toBe('Error cleaning field name, error: an error')
  }
})

test('pass currentDoc cleaning arrays', async () => {
  const aItem = {name: 'Nicolás'}
  const doc = {items: [aItem]}

  const item = {
    name: asSchemaNode<string>({
      type: String,
      async autoValue(name: string, {currentDoc}) {
        expect(currentDoc).toBe(aItem)
        return name
      }
    })
  }

  const schema = {
    items: asSchemaNode<object[]>({
      type: [item],
      async autoValue(items, {currentDoc}) {
        expect(currentDoc).toBe(doc)
        return items
      }
    })
  }

  expect.assertions(2)
  await clean(schema, doc)
})

test('omit undefined items in array', async () => {
  const doc = {items: [{name: 'Nicolás'}]}

  const item = {
    name: {
      type: String
    },
    __clean() {
      return undefined
    }
  }

  const schema = {
    items: {
      type: [item]
    }
  }

  // @ts-ignore TODO: Check why the __clean method is being used here instead of clean
  const result = await clean(schema, doc)
  expect(result).toEqual({items: []})
})

test('passes extra arguments to clean', async () => {
  const doc = {
    name: 'Nicolás'
  }

  const schema = {
    name: {
      type: String,
      autoValue(name, info, arg1, arg2) {
        expect(arg1).toBe(1)
        expect(arg2).toBe(2)
        return name
      }
    }
  }

  expect.assertions(2)
  await clean(schema, doc, null, 1, 2)
})

test('throws error when cleaning field with no type', async () => {
  const schema = {
    name: {
      type: null,
      autoValue(name, info, arg1, arg2) {
        return 'Nicolás'
      }
    }
  }

  expect.assertions(1)
  try {
    await clean(schema)
  } catch (error) {
    expect(error.message).toBe('Error cleaning field name, error: Cleaning field with no type')
  }
})

test('cleans when no argument is passed', async () => {
  const schema = {
    name: {
      type: String,
      autoValue(name, info, arg1, arg2) {
        return 'Nicolás'
      }
    }
  }

  const result = await clean(schema)
  expect(result).toEqual({name: 'Nicolás'})
})

test('pass currentDoc cleaning complex schemas', async () => {
  const aCar = {brand: 'Jeep'}
  const aMom = {name: 'Paula', car: aCar}
  const aItem = {name: 'Nicolás', mom: aMom}
  const doc = {items: [aItem]}

  const car = {
    brand: {
      type: String,
      async autoValue(value, {currentDoc}) {
        expect(value).toEqual(aCar.brand)
        expect(currentDoc).toEqual(aCar)
        return value
      }
    },
    async __clean(value, info) {
      expect(value).toEqual(aMom.car)
      expect(info.currentDoc).toEqual(aMom)
      return value
    }
  }

  const mom = {
    name: {
      type: String,
      async autoValue(value, {currentDoc}) {
        expect(value).toEqual(aMom.name)
        expect(currentDoc).toEqual(aMom)
        return value
      }
    },
    car: {
      type: car,
      async autoValue(value, {currentDoc, doc}) {
        expect(value).toEqual(aMom.car)
        expect(currentDoc).toEqual(aMom)
        return value
      }
    }
  }

  const item = {
    name: {
      type: String,
      async autoValue(value, {currentDoc}) {
        expect(value).toEqual(aItem.name)
        expect(currentDoc).toEqual(aItem)
        return value
      }
    },
    mom: {
      type: mom,
      async autoValue(value, {currentDoc}) {
        expect(value).toEqual(aItem.mom)
        expect(currentDoc).toEqual(aItem)
        return value
      }
    }
  }

  const schema = {
    items: {
      type: [item],
      async autoValue(value, {currentDoc}) {
        expect(value).toEqual(doc.items)
        expect(currentDoc).toEqual(doc)
        return value
      }
    }
  }

  expect.assertions(14)
  // @ts-ignore TODO: Check why the __clean method is being used here instead of clean
  await clean(schema, doc)
})
