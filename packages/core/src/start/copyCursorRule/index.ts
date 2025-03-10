import path from 'path'
import fs from 'fs/promises'
import https from 'https'
import colors from 'colors/safe'

const rules = [
  'orionjs.mdx',
  'orionjs-component.mdx',
  'orionjs-repository.mdx',
  'orionjs-schema.mdx',
  'orionjs-services.mdx',
  'orionjs-resolvers.mdx',
]

// Function to download the file content
const downloadFile = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download, status code: ${response.statusCode}`))
        return
      }

      let data = ''
      response.on('data', (chunk) => {
        data += chunk
      })
      response.on('end', () => {
        resolve(data)
      })
      response.on('error', (err) => {
        reject(err)
      })
    })
  })
}

export async function copyCursorRule() {
  const baseUrl = `https://raw.githubusercontent.com/orionjs/orionjs/refs/heads/master/mdc`

  try {
    // Create target directory if it doesn't exist
    const targetDir = path.join(process.cwd(), '.cursor', 'rules')
    await fs.mkdir(targetDir, { recursive: true })

    // Process each rule file
    for (const rule of rules) {
      // Change extension from .mdx to .mdc
      const targetFileName = rule.replace('.mdx', '.mdc')
      const targetFile = path.join(targetDir, targetFileName)

      // Construct source URL
      const sourceUrl = `${baseUrl}/${rule}`

      // console.log(colors.gray(`=> ✨ Downloading ${colors.cyan(rule)} to ${colors.cyan(targetFileName)}...`))

      // Download the file content
      const content = await downloadFile(sourceUrl)

      // Write the content to the target file
      await fs.writeFile(targetFile, content, 'utf8')

      console.log(colors.bold(`=> ✨ Successfully downloaded ${colors.cyan(targetFileName)}`))
    }

    console.log(colors.bold('=> ✨ All rule files have been successfully copied'))
  } catch (error) {
    console.error(colors.red(`Error copying rule files: ${error.message}`))
  }
}