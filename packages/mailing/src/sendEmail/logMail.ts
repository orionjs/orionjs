import {MailOptions} from 'nodemailer/lib/json-transport'

export default function (options: MailOptions) {
  console.info(`
    === Email Sent ===
    From: ${options.from}
    To: ${options.to}
    Subject: ${options.subject}

    ${options.text ? options.text : options.html}
    ==================`)
}
