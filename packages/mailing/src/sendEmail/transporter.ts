import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport(process.env.MAIL_URL)

transporter.verify(function (error) {
  if (error) {
    console.error('Error connecting to mailing transport:', error)
  }
})

export default transporter
