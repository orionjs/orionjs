#!/bin/bash

# Script to delete all node_modules and .turbo folders in packages/
echo "Cleaning packages directory..."

# Find and delete all node_modules folders
echo "Deleting node_modules folders..."
find ./packages -type d -name "node_modules" -exec rm -rf {} +

# Find and delete all .turbo folders
echo "Deleting .turbo folders..."
find ./packages -type d -name ".turbo" -exec rm -rf {} +

echo "Clean complete!" 