import {internalGetEnv} from '@orion-js/env'
import nodemailer, {Transporter} from 'nodemailer'

const envMailURL = internalGetEnv('mail_url', 'MAIL_URL')

let transporter: Transporter<any> = {} as Transporter<any>

if (!envMailURL) {
  if (!process.env.ORION_TEST) {
    console.info('MAIL_URL env var not set. Will log emails to console instead.')
  }
} else {
  const currTransporter = nodemailer.createTransport(envMailURL)

  currTransporter.verify(function (error) {
    if (error) {
      console.error('Error connecting to mailing transport:', error)
    }
  })
  transporter = currTransporter
}

export default transporter
