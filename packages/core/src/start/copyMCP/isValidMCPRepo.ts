import fs from 'fs/promises'
import path from 'path'
import colors from 'colors/safe'
import { VERSION_FILE, MCP_VERSION } from './consts'

/**
 * Checks if the MCP repository appears to be already installed correctly
 * and has the current version
 */
export async function isValidMCPRepository(directoryPath: string): Promise<boolean> {
  try {
    // Check if directory exists
    const stats = await fs.stat(directoryPath)
    if (!stats.isDirectory()) return false

    // Check for some key files/directories that should exist in the repository
    // This helps verify it's a valid repository and not just an empty or corrupted directory
    const expectedFiles = ['README.md', 'docs', 'package.json']

    for (const file of expectedFiles) {
      try {
        await fs.access(path.join(directoryPath, file))
      } catch {
        // If any expected file doesn't exist, consider the repository invalid
        return false
      }
    }

    // Check if version file exists and has the correct version
    try {
      const versionPath = path.join(directoryPath, VERSION_FILE)
      const versionContent = await fs.readFile(versionPath, 'utf-8')

      // If the version in the file doesn't match the current version,
      // consider the repository outdated
      if (versionContent.trim() !== MCP_VERSION) {
        console.log(colors.yellow(`MCP version mismatch: installed=${versionContent.trim()}, required=${MCP_VERSION}`))
        return false
      }
    } catch {
      // Version file doesn't exist or can't be read
      return false
    }

    // All checks passed, consider it a valid and current repository
    return true
  } catch {
    // Any error means directory doesn't exist or can't be accessed
    return false
  }
}