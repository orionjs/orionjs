import nodemailer, {Transporter} from 'nodemailer'

export default function transporter(smtpURL: string): Transporter {
  let transport: Transporter<any> = {} as Transporter<any>

  if (!smtpURL) {
    if (!process.env.ORION_TEST) {
      console.info('SMTP URL env var was not provided. Will log emails to console instead.')
    }
  } else {
    const currTransporter = nodemailer.createTransport(smtpURL)

    currTransporter.verify(function (error) {
      if (error) {
        console.error('Error connecting to mailing transport:', error)
      }
    })
    transport = currTransporter
  }

  return transport
}
