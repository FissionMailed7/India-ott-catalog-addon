#!/usr/bin/env node

/**
 * This file is for development/testing only.
 * For Vercel deployment, use: npm start (which runs local-server.js)
 * For production, Vercel uses: api/index.js
 */

// For local development
require('./local-server.js');

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);});
