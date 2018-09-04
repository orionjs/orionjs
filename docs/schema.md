---
id: schema
title: Schema
sidebar_label: Schema
---

Orionjs schema has two main purposes. First, it describes the structure of each Model, with this
you automatically get the GraphQL schema. Second, if you specify a Model in the setup of
a Collection, it will validate the structure before it's get inserted or updated into the MongoDB.
You can also use the `validate` function which will throw a `ValidationError` if the object doesn't
fit the given schema. It's important to note that `validate` is `async`.

## Basic Usage

In Orionjs schemas are defined as a plain object with an specific structure.

#### Example

```js
import {validate} from '@orion-js/schema'

const bookSchema = {
  title: {
    type: String,
    label: 'Name'
  },
  author: {
    type: String,
    label: 'Author'
  },
  releaseDate: {
    type: Date,
    label: 'Release Date',
    optional: true
  }
}

// The following will pass
await validate(bookSchema, {title: 'The Book',author: 'The author'})
await validate(bookSchema, {title: 'The Book',author: 'The author',releaseDate: new Date()})

// The following will throw a ValidationError
await validate(bookSchema, {title: 'The Book'}) // The author is missing
await validate(bookSchema, {title: 'The Book',author: 'The author',releaseDate: 3}) // releaseDate should be type date
```

## Schema rules

There are several options available, the only required is `type`.

The options available are:

### Types

The `type` has the following options:

- `String` or `'string'`.
- `Number` or `'number'`.
- `Date` or `'date'`.
- `Boolean` or `'boolean'`.
- `'ID'` allows you to save an id which could be a string or an integer.
- `'email'` checks if the email has a valid format.
- `'integer'` allows you to save integers.
- `'blackbox'` allows you to save any object.
- Custom, you can set as a type any Model.

All the types can be used as array, for example if you want an array of `String` you should use
`[String]`.

### label

The `label` should be a `String`, it's used by [orionjs-react-autoform](https://github.com/orionjs/orionjs-react-autoform 'orionjs-react-autoform').

### description

The `description` should be a `String`, it will be the description for GraphQL and it's used by [orionjs-react-autoform](https://github.com/orionjs/orionjs-react-autoform 'orionjs-react-autoform')
.

### optional

By default, all keys are required. Set `optional: true` to make a field optional.

### min/max

- If `type` is `Number` or `'integer'`, these rules define the minimum and maximum numeric value.
- If `type` is `String`, these rules define the minimum or maximum string length.
- If `type` is `Date`, these rules define the minimum or maximum date.

### allowedValues

Should be an array of values.

- If `type` is `Number`, `String`, `Date` or `'integer'` it will allow only values specified in
  this field.
- If `type` is an array of any type, it will accept only values specified in this field.

### defaultValue

Defines the default value for the field if nothing was given.

### validate

This receives a function - which could be `async` - with the following arguments:

- `fieldValue`: it's the value for the given field.
- `options`: an object with the following keys:
  - `schema`: the full schema you are validating against.
  - `currentSchema`: The subpart of the schema you are validating.
  - `doc`: the full object you are validating.
  - `currentDoc`: the subpart of the object you are validating.

With this function you can make a custom validation of the value, it should return the error message
if any and nothing if it has been successfully validated

#### Example, we will make a custom email validation without the use of the type `'email'`

```js
const schema = {
  email: {
    type: String,
    validate(fieldValue) {
      // Regex to test if an email is valid
      const regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

      if (!regex.test(fieldValue)) return 'notAnEmail'
    }
  }
}
```

### clean

This receives a function - which could be `async` - with the following arguments:

- `fieldValue`: it's the value for the given field.
- `options`: an object with the following keys:
  - `doc`: the full object you are validating.
  - `currentDoc`: the subpart of the object you are validating.

With this function you can make a custom clean of the value, it should return the new value for this
field
