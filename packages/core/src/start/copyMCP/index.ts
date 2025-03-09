import path from 'path'
import fs from 'fs/promises'
import execute from '../../helpers/execute'
import colors from 'colors/safe'
import { isValidMCPRepository } from './isValidMCPRepo'
import { MCP_VERSION, VERSION_FILE } from './consts'

export async function copyMCP() {
  const repoUrl = 'https://github.com/orionjs/mcp-docs'
  const targetDir = path.join(process.cwd(), '.orion', 'mcp')

  try {
    // Ensure parent directory exists
    await fs.mkdir(path.join(process.cwd(), '.orion'), { recursive: true })

    // Check if the repository is already properly installed with current version
    if (await isValidMCPRepository(targetDir)) {
      // console.log(colors.green(`MCP documentation already installed in .orion/mcp (version ${MCP_VERSION})`))
      return
    }

    // Check if the directory already exists but is not a valid repository or has outdated version
    try {
      const stats = await fs.stat(targetDir)
      if (stats.isDirectory()) {
        // Directory exists, remove it first to ensure fresh clone
        await fs.rm(targetDir, { recursive: true, force: true })
        console.log(colors.yellow(`Removed existing .orion/mcp directory (invalid, incomplete, or outdated)`))
      }
    } catch (error) {
      // Directory doesn't exist, which is fine
    }

    // Clone the repository
    console.log(colors.bold(`Downloading MCP documentation v${MCP_VERSION}...`))
    await execute(`git clone ${repoUrl} ${targetDir}`)

    // Remove git directory to avoid confusion
    await execute(`rm -rf ${path.join(targetDir, '.git')}`)

    // Create version file
    await fs.writeFile(path.join(targetDir, VERSION_FILE), MCP_VERSION, 'utf-8')

    console.log(colors.green(`Successfully downloaded MCP documentation v${MCP_VERSION} to .orion/mcp`))
  } catch (error) {
    console.error(colors.red('Error copying MCP documentation:'), error)
    throw error
  }
}