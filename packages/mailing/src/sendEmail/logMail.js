import {config} from '@orion-js/app'

export default function (options) {
  const {logger} = config()
  logger.info(`
    === Email Sent ===
    From: ${options.from}
    To: ${options.to}
    Subject: ${options.subject}

    ${options.text ? options.text : options.html}
    ==================`)
}
