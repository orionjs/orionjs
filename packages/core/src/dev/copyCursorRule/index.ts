import fs from 'node:fs/promises'
import https from 'node:https'
import path from 'node:path'
import chalk from 'chalk'

const rules = [
  'orionjs.mdx',
  'orionjs-component.mdx',
  'orionjs-repository.mdx',
  'orionjs-schema.mdx',
  'orionjs-services.mdx',
  'orionjs-resolvers.mdx',
  'orionjs-tov4.mdx',
]

// Function to download the file content
const downloadFile = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    https.get(url, response => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download, status code: ${response.statusCode}`))
        return
      }

      let data = ''
      response.on('data', chunk => {
        data += chunk
      })
      response.on('end', () => {
        resolve(data)
      })
      response.on('error', err => {
        reject(err)
      })
    })
  })
}

export async function copyCursorRule() {
  const baseUrl = 'https://raw.githubusercontent.com/orionjs/orionjs/refs/heads/master/mdc'

  try {
    // Create target directory if it doesn't exist
    const targetDir = path.join(process.cwd(), '.cursor', 'rules')
    await fs.mkdir(targetDir, {recursive: true})

    // Process each rule file
    await Promise.all(
      rules.map(async rule => {
        // Change extension from .mdx to .mdc
        const targetFileName = rule.replace('.mdx', '.mdc')
        const targetFile = path.join(targetDir, targetFileName)

        // Construct source URL
        const sourceUrl = `${baseUrl}/${rule}`

        // console.log(chalk.gray(`=> ✨ Downloading ${chalk.cyan(rule)} to ${chalk.cyan(targetFileName)}...`))

        // Download the file content
        const content = await downloadFile(sourceUrl)

        // Write the content to the target file
        await fs.writeFile(targetFile, content, 'utf8')

        console.log(chalk.bold(`=> ✨ Successfully downloaded ${chalk.cyan(targetFileName)}`))
      }),
    )

    console.log(chalk.bold('=> ✨ All rule files have been successfully copied'))
  } catch (error) {
    console.error(chalk.red(`Error copying rule files: ${error.message}`))
  }
}
