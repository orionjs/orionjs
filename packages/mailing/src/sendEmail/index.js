import transporter from './transporter'
import logMail from './logMail'

const defaultMailOptions = {
  from: '"Orionjs App" <app@orionjs.com>'
}

export default async function(options) {
  const mailOptions = {
    ...defaultMailOptions,
    ...options
  }
  const result = await transporter.sendMail(mailOptions)

  if (!process.env.MAIL_URL) {
    logMail(mailOptions)
  }

  return result
}
