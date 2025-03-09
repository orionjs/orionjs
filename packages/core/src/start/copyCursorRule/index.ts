import path from 'path'
import fs from 'fs/promises'
import https from 'https'
import colors from 'colors/safe'

export async function copyCursorRule() {
  const sourceUrl = 'https://raw.githubusercontent.com/orionjs/orionjs/refs/heads/master/.cursor/rules/orionjs.mdc'
  const targetDir = path.join(process.cwd(), '.cursor', 'rules')
  const targetFile = path.join(targetDir, 'orionjs.mdc')

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
      }).on('error', (err) => {
        reject(err)
      })
    })
  }

  try {
    // Ensure the directory exists
    await fs.mkdir(targetDir, { recursive: true })

    // Download the file content
    const content = await downloadFile(sourceUrl)

    // Write the content to the target file
    await fs.writeFile(targetFile, content, 'utf8')

    console.log(colors.bold(`Updated .cursor/rules/orionjs.mdc to the latest version`))

  } catch (error) {
    console.error('Error copying cursor rule:', error)
    throw error
  }
}