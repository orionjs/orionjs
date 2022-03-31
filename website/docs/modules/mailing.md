---
id: mailing
title: Mailing
sidebar_label: Mailing
sidebar_position: 5
---

The `mailing` package helps you sending emails in your app.

## Install Mailing package

```bash npm2yarn
npm install @orion-js/mailing
```

## Configuration

The configuration of `mailing` is done by setting the following environment variables:

- `MAIL_URL`: You must pass a valid SMTP url. If you don't pass any, all mails sent will be logged in the console.
  - Note 1: The smtp url format looks like: `smtp://<user>:<password>@<smtp-server-url>:<port>`
  - Note 2: If your `username / API Key` or `password` include characters like `/` or `\` or any other invalid url character, as in Amazon Web Services Simple Email Service, you must encode them to be valid.
    You can use tools like [urlencoder](https://www.urlencoder.org/) to encode your `username` and `password`.
- `MAIL_FROM`: A valid from address. You can also pass the `from` option when calling `sendEmail`.

### Example .env

```bash title=".env"
...
MAIL_URL="smtp://<user>:<password>@<smtp-server-url>:<port>"
MAIL_FROM="example@domain.com"
...
```

## Sending emails

### Plain text

To send a email you must call the `sendEmail` function.

```ts
import {sendEmail} from '@orion-js/mailing'

await sendEmail({
  to: await user.email(),
  subject: 'Verify your email',
  text: `Hi, please verify your email by going to the following site: ${url}`
})
```

All options will be passed to [nodemailer `sendMail` function](https://nodemailer.com/message/).

### HTML

Alternatively, in addition to sending text you can also send HTML.

```ts
import {sendEmail} from '@orion-js/mailing'

await sendEmail({
  to: await user.email(),
  subject: 'Welcome',
  text: null,
  html: getHTML()
})
```

### Example using ReactDomServer

In this example, `importHTML()` will use [`renderToString`](https://reactjs.org/docs/react-dom-server.html#rendertostring) to render the `Template` [React](https://reactjs.org/) element into an HTML string:

```js title="index.js"
import {sendEmail} from '@orion-js/mailing'

await sendEmail({
  to: await user.email(),
  subject: 'Welcome',
  text: null,
  html: await importHTML(user.nickName)
})
```

```js title="importHTML.js"
import {renderToString} from 'react-dom/server'
import Template from './Template'

export default function (nickName) {
  const bodyToInsert = renderToString(<Template>{nickName}</Template>)

  return `<html lang="es">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width">
              <meta http-equiv="X-UA-Compatible" content="IE=edge">
              <title></title>
            </head>
            <body>
            ${bodyToInsert}
            </body>
          </html>`
}
```

```ts title="Template.js"
import React from 'react'
import PropTypes from 'prop-types'

export default class Template extends React.Component {
  static propTypes = {
    nickName: PropTypes.string
  }

  render() {
    return (
      <div>
        <div style={{padding: '20px', backgroundColor: '#111'}}>
          <div
            style={{padding: '20px', maxWidth: '600px', backgroundColor: '#fff', margin: '0 auto'}}>
            Greetings, {this.props.nickName}!
          </div>
        </div>
        <div style={{margin: '0 auto', textAlign: 'center', padding: '20px'}}>
          <p>
            <a>Comments</a>
            <a>Contact</a>
          </p>
        </div>
      </div>
    )
  }
}
```
