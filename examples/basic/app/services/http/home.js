import {route} from '@orion-js/app'
import {sendEmail} from '@orion-js/mailing'

route('/', async function() {
  await sendEmail({
    to: ['anemail@me.com', 'a2email@me.com'],
    subject: 'testing',
    text: 'Hello this is a text'
  })
  return 'hi'
})
