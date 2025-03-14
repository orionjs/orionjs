import fs from 'node:fs/promises'
import path from 'node:path'
import chalk from 'chalk'
import execute from '../../helpers/execute'
import {MCP_VERSION, VERSION_FILE} from './consts'
import {isValidMCPRepository} from './isValidMCPRepo'

export async function copyMCP() {
  const repoUrl = 'https://github.com/orionjs/mcp-docs'
  const targetDir = path.join(process.cwd(), '.orion', 'mcp')

  try {
    // Ensure parent directory exists
    await fs.mkdir(path.join(process.cwd(), '.orion'), {recursive: true})

    // Check if the repository is already properly installed with current version
    if (await isValidMCPRepository(targetDir)) {
      console.log(chalk.bold('=> ✨ MCP documentation already installed'))
      return
    }

    // Check if the directory already exists but is not a valid repository or has outdated version
    try {
      const stats = await fs.stat(targetDir)
      if (stats.isDirectory()) {
        // Directory exists, remove it first to ensure fresh clone
        await fs.rm(targetDir, {recursive: true, force: true})
        console.log(
          chalk.bold(
            '=> ✨ Removed existing .orion/mcp directory (invalid, incomplete, or outdated)',
          ),
        )
      }
    } catch (_) {
      // Directory doesn't exist, which is fine
    }

    // Clone the repository
    console.log(chalk.bold(`=> ✨ Downloading MCP documentation ${MCP_VERSION}...`))
    await execute(`git clone ${repoUrl} ${targetDir}`)

    // Remove git directory to avoid confusion
    await execute(`rm -rf ${path.join(targetDir, '.git')}`)

    // Create version file
    await fs.writeFile(path.join(targetDir, VERSION_FILE), MCP_VERSION, 'utf-8')

    console.log(
      chalk.bold(`=> ✨ Successfully downloaded MCP documentation v${MCP_VERSION} to .orion/mcp`),
    )

    // Install dependencies in the MCP directory
    console.log(chalk.bold('=> ✨ Installing MCP dependencies...'))
    await execute(`cd ${targetDir} && npm install`)
    console.log(chalk.bold('=> ✨ Successfully installed MCP dependencies'))

    const relativePath = path.relative(process.cwd(), targetDir)
    console.log(relativePath)
    const mcpServerConfig = {
      mcpServers: {
        'Orionjs documentation search': {
          command: 'node',
          args: [`./${path.join(relativePath, 'src', 'index.js')}`],
        },
      },
    }

    const configPath = path.join(process.cwd(), '.cursor', 'mcp.json')

    // Check if the config file exists
    try {
      // Try to read existing config file
      const existingConfig = await fs.readFile(configPath, 'utf-8')
      const parsedConfig = JSON.parse(existingConfig)

      // Update the mcpServers section while preserving other settings
      parsedConfig.mcpServers = {
        ...parsedConfig.mcpServers,
        ...mcpServerConfig.mcpServers,
      }

      // Write the updated config back
      await fs.writeFile(configPath, JSON.stringify(parsedConfig, null, 2), 'utf-8')
      console.log(chalk.bold('=> ✨ Updated MCP server configuration in .cursor/mcp.json'))
    } catch (_) {
      // If file doesn't exist or can't be parsed, create a new one
      // Ensure the .cursor directory exists
      await fs.mkdir(path.dirname(configPath), {recursive: true})

      // Write the new config file
      await fs.writeFile(configPath, JSON.stringify(mcpServerConfig, null, 2), 'utf-8')
      console.log(chalk.bold('=> ✨ Created new MCP server configuration in .cursor/mcp.json'))
    }
  } catch (error) {
    console.error(chalk.red('=> ✨ Error copying MCP documentation:'), error)
    throw error
  }
}
