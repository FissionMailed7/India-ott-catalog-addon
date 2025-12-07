#!/bin/bash
set -e

# Install beamup-cli if not installed
if ! command -v beamup &> /dev/null; then
    echo "Installing beamup-cli..."
    npm install -g beamup-cli
fi

# Run beamup config
echo "Running beamup config..."
beamup config

# Deploy
echo "Deploying to Baby Beamup Club..."
beamup

echo "Deployment complete! Use the provided URL in Stremio."
