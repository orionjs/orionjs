#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const packagesDir = path.join(process.cwd(), 'packages');

// Get all package.json files
const packageJsonFiles = [];
fs.readdirSync(packagesDir).forEach(dir => {
  const packageJsonPath = path.join(packagesDir, dir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    packageJsonFiles.push(packageJsonPath);
  }
});

console.log(`Found ${packageJsonFiles.length} package.json files to update`);

// Update each package.json
packageJsonFiles.forEach(filePath => {
  try {
    const packageJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let modified = false;
    
    // Update dependencies
    if (packageJson.dependencies) {
      Object.keys(packageJson.dependencies).forEach(dep => {
        if (dep.startsWith('@orion-js/')) {
          packageJson.dependencies[dep] = 'workspace:*';
          modified = true;
        }
      });
    }
    
    // Update devDependencies
    if (packageJson.devDependencies) {
      Object.keys(packageJson.devDependencies).forEach(dep => {
        if (dep.startsWith('@orion-js/')) {
          packageJson.devDependencies[dep] = 'workspace:*';
          modified = true;
        }
      });
    }
    
    // Update peerDependencies
    if (packageJson.peerDependencies) {
      Object.keys(packageJson.peerDependencies).forEach(dep => {
        if (dep.startsWith('@orion-js/')) {
          packageJson.peerDependencies[dep] = 'workspace:*';
          modified = true;
        }
      });
    }
    
    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(packageJson, null, 2) + '\n');
      console.log(`Updated dependencies in ${path.relative(process.cwd(), filePath)}`);
    } else {
      console.log(`No internal dependencies found in ${path.relative(process.cwd(), filePath)}`);
    }
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err);
  }
});

console.log('All done!'); 