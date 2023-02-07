import nodemailer from 'nodemailer'
import {config} from '@orion-js/app'

const {mailing, logger} = config()

const transportConfig = mailing ||
  process.env.MAIL_URL || {
    streamTransport: true,
    newline: 'unix'
  }

const transporter = nodemailer.createTransport(transportConfig)

export default transporter
