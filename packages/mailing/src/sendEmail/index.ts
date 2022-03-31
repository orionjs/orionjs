import defaultTransporter from './transporter'
import logMail from './logMail'
import {SendMailOptions, SentMessageInfo, Transporter} from 'nodemailer'
import {internalGetEnv} from '@orion-js/env'

const envMailFrom = internalGetEnv('mail_from', 'MAIL_FROM')
const envMailURL = internalGetEnv('mail_url', 'MAIL_URL')

const defaultMailOptions = {
  from: envMailFrom || '"Orionjs App" <app@orionjs.com>'
}

export default async function (
  options: SendMailOptions,
  transporter: Transporter<any> = defaultTransporter
): Promise<SentMessageInfo> {
  const mailOptions = {
    ...defaultMailOptions,
    ...options
  }

  if (!envMailURL) {
    logMail(mailOptions)
  } else {
    const result = await transporter.sendMail(mailOptions)
    return result
  }
}
