import nodemailer from 'nodemailer'

const mailURL = process.env.MAIL_URL

let transporter = null

if (mailURL) {
  transporter = nodemailer.createTransport(mailURL)
  transporter.verify(function(error, success) {
    if (error) {
      console.log('Error connecting to SMTP:', error)
    }
  })
} else {
  transporter = nodemailer.createTransport({
    streamTransport: true,
    newline: 'unix'
  })
}

export default transporter
