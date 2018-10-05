---
id: mailing
title: Mailing
sidebar_label: Mailing
---

The `mailing` package helps you sending emails in your app.

```sh
yarn install @orion-js/mailing
```

## Configuration

The configuration of `mailing` is done by setting the following environment variables:

- `MAIL_URL`: You must pass a valid SMTP url. If you don't pass any, all mails sent will be logged in the console.
- `MAIL_FROM`: A valid from address. You can also pass the `from` option when calling `sendEmail`.

## Sending emails

To send a email you must call the `sendEmail` function.

```js
import {sendEmail} from '@orion-js/mailing'

await sendEmail({
  to: await user.email(),
  subject: 'Verify your email',
  text: `Hi, please verify your email by going to the following site: ${url}`
})
```

All options will be passed to [nodemailer `sendMail` function](https://nodemailer.com/message/).
