import nodemailer from 'nodemailer'
import {config} from '@orion-js/app'

const {mailing, logger} = config()

const transportConfig = mailing ||
  process.env.MAIL_URL || {
    streamTransport: true,
    newline: 'unix'
  }

const transporter = nodemailer.createTransport(transportConfig)
transporter.verify(function (error, success) {
  if (error) {
    logger.error('Error connecting to mailing transport:', error)
  }
})

export default transporter
