import nodemailer, {Transporter} from 'nodemailer'

let transporter: Transporter<any> = {} as Transporter<any>

if (!process.env.MAIL_URL) {
  console.info('MAIL_URL env var not set. Will log emails to console instead.')
} else {
  const currTransporter = nodemailer.createTransport(process.env.MAIL_URL)

  currTransporter.verify(function (error) {
    if (error) {
      console.error('Error connecting to mailing transport:', error)
    }
  })
  transporter = currTransporter
}

export default transporter
