#!/bin/bash

# AI Git Summary - Command Line Interface
# This script provides an easy way to run the git-summary CLI tool

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    echo "Please install Node.js (version 18 or higher) and try again."
    exit 1
fi

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if the project is built
if [ ! -f "$SCRIPT_DIR/dist/src/cli/index.js" ]; then
    echo "📦 Building the project..."
    cd "$SCRIPT_DIR"
    
    # Check if we have npm or yarn
    if command -v yarn &> /dev/null; then
        yarn build
    elif command -v npm &> /dev/null; then
        npm run build
    else
        echo "❌ Neither npm nor yarn found. Please install one of them."
        exit 1
    fi
    
    if [ $? -ne 0 ]; then
        echo "❌ Build failed. Please check the error messages above."
        exit 1
    fi
fi

# Run the CLI tool with all passed arguments
node "$SCRIPT_DIR/dist/src/cli/index.js" "$@" 