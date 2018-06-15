export default function(options) {
  console.log('=== Email Sent ===')
  console.log(`From: ${options.from}`)
  console.log(`To: ${options.to}`)
  console.log(`Subject: ${options.subject}`)
  console.log('')
  if (options.text) {
    console.log(options.text)
  } else if (options.html) {
    console.log(options.html)
  }
  console.log('==================')
}
