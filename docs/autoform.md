---
id: autoform
title: Autoform
sidebar_label: Autoform
---

[Autoform](https://github.com/orionjs/orionjs-react-autoform) is an Orionjs package, available to import in any React project and usable as a React Component. It allows to specify the name of a `mutation` as a prop and automatically setting a form for it, allowing faster developing.

## Background

The client side provided by the [Orionjs Full-stack Boilerplate](https://github.com/orionjs/boilerplate-graphql-fullstack) has this structure:

```
web
└── App
    ├── Pages
    ├── Root
    ├── components
    │   ├── AutoForm
    │   └── fields
    ├── helpers
    ├── i18n
    └── index.js
```

By default, the `components` folder will have a folder called `AutoForm` containing a `index.js` with the next structure:

```js
import createAutoform from 'orionjs-react-autoform'
import fields from '../fields'
import translate from 'App/i18n/translate'

const Autoform = createAutoform({
  fields,
  onError: error => alert(error.message),
  getErrorText: (code, field) => {
    return translate(`errors.${code}`, field)
  }
})

export default Autoform
```

- `createAutoform` : Returns the `Autoform` component.
- `fields` : Object that allows Autoform to distinguish the fields of the schema specified in the mutation resolver (see [`Mutation Resolvers`](https://orionjs.com/docs/resolvers#mutation-resolver))

## Usage

### Client-side

`Autoform` can be called as a React Component:

```js
import React from 'react'
import PropTypes from 'prop-types'
import Button from 'orionsoft-parts/lib/components/Button'
import AutoForm from 'App/components/AutoForm'

export default class Create extends React.Component {
  static propTypes = {}

  success() {
    alert('Success')
  }

  render() {
    const genre = 'terror'
    return (
      <div>
        <AutoForm
          mutation="insertMovie"
          ref="form"
          doc={{genre}}
          onSuccess={() => this.success()}
        />
        <br />
        <Button onClick={() => this.refs.form.submit()}>Register Movie</Button>
      </div>
    )
  }
}
```

- `mutation`: Name of the mutation.
- `ref`: Reference of the Autoform inside the component. In this case, is used by the Button component.
- `doc`: Object that sets the initial [`state`](https://reactjs.org/docs/state-and-lifecycle.html) of the Form. The form works with an internal state, which will be the data that will be send to the mutation as parameters.
- `onSuccess`: Action triggered after completed the mutation.

This will show in the component the corresponding fields from the mutation schema. The field for `genre` will have `terror` as variable value.

An alternative usage implies declaring the fields manually as children of the Autoform component using the `Field` component from [`simple-react-form`](https://github.com/nicolaslopezj/simple-react-form). This is recommended when a specific behavior for a field is required:

```js
import React from 'react'
import PropTypes from 'prop-types'
import Button from 'orionsoft-parts/lib/components/Button'
import AutoForm from 'App/components/AutoForm'
import {Field} from 'simple-react-form'
import Text from 'orionsoft-parts/lib/components/fields/Text'

export default class Create extends React.Component {
  static propTypes = {}

  success() {
    alert('Success')
  }

  render() {
    const genre = 'terror'
    return (
      <div>
        <AutoForm mutation="insertMovie" ref="form" doc={{genre}} onSuccess={() => this.success()}>
          <div className="label">Name:</div>
          <Field fieldName="name" type={Text} />
          <div className="label">Genre:</div>
          <Field fieldName="genre" type={Text} />
          <div className="label">Insert an optional description:</div>
          <Field fieldName="description" type={Text} />
        </AutoForm>
        <br />
        <Button onClick={() => this.refs.form.submit()}>Register Movie</Button>
      </div>
    )
  }
}
```

Other props that Autoform can use are:

- `schema`: It allows to specify a schema directly from an object in the React Component.
- `clean`: By default, `Autoform` uses the [`clean`](https://orionjs.com/docs/models#validate-and-clean) method from Orionjs, but it can receive a custom `clean` method.
- `validate`: By default, `Autoform` uses the [`validate`](https://orionjs.com/docs/models#validate-and-validate) method from Orionjs, but it can receive a custom `validate` method.
- `omit`: It receives an array containing the names of the elements in the schema you don't want to render as fields.
- `only`: It receives an array containing only the names of the elements in the schema you want to render.
- `fragment`: Only use this property when using the Autoform component inside a [`React.Fragment`](https://reactjs.org/docs/fragments.html).

### Server-side

For this example, the `insertMovie` mutation should already be declared in the `index.js` file in the root of the `resolvers` folder, and have this structure:

```js
import {resolver} from '@orion-js/app'
import Movies from 'app/collections/Movies'
import Movie from 'app/models/Movie'

export default resolver({
  params: {
    name: {
      type: String
    },
    genre: {
      type: String
    },
    description: {
      type: String,
      optional: true
    }
  },
  returns: Boolean,
  mutation: true,
  async resolve({name, genre, description}, viewer) {
    const movie = await Movies.insertOne({name, genre, description})
    return true
  }
})
```

By using the schema in the `params` object, the `Autoform` component will show 3 input fields: `name`, `genre`, and `description`.
