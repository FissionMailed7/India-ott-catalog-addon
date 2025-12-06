#!/usr/bin/env node

/**
 * Quick test script for India OTT Catalog Addon
 * Tests all endpoints and validates configuration
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const LOCAL_PORT = 7000;
const BASE_URL = `http://localhost:${LOCAL_PORT}`;

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    gray: '\x1b[90m'
};

// Helper function to make HTTP requests
function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error(`Request timeout after 5s: ${url}`));
        }, 5000);

        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                clearTimeout(timeout);
                resolve({ status: res.statusCode, data, headers: res.headers });
            });
        }).on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
        });
    });
}

// Test functions
async function testConnection() {
    console.log(`${colors.blue}Testing server connection...${colors.reset}`);
    try {
        const result = await makeRequest(`${BASE_URL}/health`);
        if (result.status === 200) {
            console.log(`${colors.green}✓ Server is running on port ${LOCAL_PORT}${colors.reset}`);
            return true;
        } else {
            console.log(`${colors.red}✗ Server returned status ${result.status}${colors.reset}`);
            return false;
        }
    } catch (error) {
        console.log(`${colors.red}✗ Could not connect to server: ${error.message}${colors.reset}`);
        console.log(`${colors.gray}   Make sure to run 'npm start' first${colors.reset}`);
        return false;
    }
}

async function testManifest() {
    console.log(`\n${colors.blue}Testing manifest endpoint...${colors.reset}`);
    try {
        const result = await makeRequest(`${BASE_URL}/manifest.json`);
        if (result.status === 200) {
            try {
                const manifest = JSON.parse(result.data);
                if (manifest.id && manifest.version) {
                    console.log(`${colors.green}✓ Manifest is valid${colors.reset}`);
                    console.log(`${colors.gray}  ID: ${manifest.id}${colors.reset}`);
                    console.log(`${colors.gray}  Version: ${manifest.version}${colors.reset}`);
                    console.log(`${colors.gray}  Name: ${manifest.name}${colors.reset}`);
                    return true;
                }
            } catch (e) {
                console.log(`${colors.red}✗ Manifest is not valid JSON${colors.reset}`);
                return false;
            }
        } else {
            console.log(`${colors.red}✗ Manifest endpoint returned status ${result.status}${colors.reset}`);
            return false;
        }
    } catch (error) {
        console.log(`${colors.red}✗ Failed to get manifest: ${error.message}${colors.reset}`);
        return false;
    }
}

async function testHealthCheck() {
    console.log(`\n${colors.blue}Testing health check...${colors.reset}`);
    try {
        const result = await makeRequest(`${BASE_URL}/health`);
        if (result.status === 200) {
            try {
                const health = JSON.parse(result.data);
                if (health.status === 'ok') {
                    console.log(`${colors.green}✓ Health check passed${colors.reset}`);
                    console.log(`${colors.gray}  Status: ${health.status}${colors.reset}`);
                    if (health.timestamp) {
                        console.log(`${colors.gray}  Timestamp: ${health.timestamp}${colors.reset}`);
                    }
                    return true;
                }
            } catch (e) {
                console.log(`${colors.yellow}⚠ Health response is not JSON${colors.reset}`);
                return false;
            }
        } else {
            console.log(`${colors.red}✗ Health check returned status ${result.status}${colors.reset}`);
            return false;
        }
    } catch (error) {
        console.log(`${colors.red}✗ Health check failed: ${error.message}${colors.reset}`);
        return false;
    }
}

async function testWebUI() {
    console.log(`\n${colors.blue}Testing web UI...${colors.reset}`);
    try {
        const result = await makeRequest(BASE_URL);
        if (result.status === 200 && result.data.includes('India OTT Catalog')) {
            console.log(`${colors.green}✓ Web UI is accessible${colors.reset}`);
            return true;
        } else {
            console.log(`${colors.red}✗ Web UI returned status ${result.status}${colors.reset}`);
            return false;
        }
    } catch (error) {
        console.log(`${colors.red}✗ Web UI test failed: ${error.message}${colors.reset}`);
        return false;
    }
}

async function testConfigFiles() {
    console.log(`\n${colors.blue}Testing configuration files...${colors.reset}`);
    const files = [
        { path: 'package.json', required: true },
        { path: 'vercel.json', required: true },
        { path: 'api/manifest.json', required: true },
        { path: 'api/index.js', required: true },
        { path: 'config.js', required: true },
        { path: 'local-server.js', required: true },
        { path: 'scrapers/index.js', required: true }
    ];

    let allGood = true;
    for (const file of files) {
        const fullPath = path.join(__dirname, file.path);
        const exists = fs.existsSync(fullPath);
        if (exists) {
            console.log(`${colors.green}✓ ${file.path}${colors.reset}`);
        } else if (file.required) {
            console.log(`${colors.red}✗ ${file.path} (MISSING)${colors.reset}`);
            allGood = false;
        } else {
            console.log(`${colors.yellow}⚠ ${file.path} (optional)${colors.reset}`);
        }
    }
    return allGood;
}

async function testCORSHeaders() {
    console.log(`\n${colors.blue}Testing CORS headers...${colors.reset}`);
    try {
        const result = await makeRequest(`${BASE_URL}/manifest.json`);
        const corsHeader = result.headers['access-control-allow-origin'];
        const contentType = result.headers['content-type'];

        if (corsHeader === '*') {
            console.log(`${colors.green}✓ CORS headers present${colors.reset}`);
        } else {
            console.log(`${colors.yellow}⚠ CORS header: ${corsHeader || 'not set'}${colors.reset}`);
        }

        if (contentType?.includes('application/json')) {
            console.log(`${colors.green}✓ Correct content-type${colors.reset}`);
        } else {
            console.log(`${colors.yellow}⚠ Content-type: ${contentType || 'not set'}${colors.reset}`);
        }

        return true;
    } catch (error) {
        console.log(`${colors.red}✗ Could not check headers: ${error.message}${colors.reset}`);
        return false;
    }
}

// Main test runner
async function runTests() {
    console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.blue}India OTT Catalog Addon - Test Suite${colors.reset}`);
    console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);

    const results = {
        connection: false,
        manifest: false,
        health: false,
        webui: false,
        config: false,
        cors: false
    };

    // Run tests
    results.connection = await testConnection();
    if (!results.connection) {
        console.log(`\n${colors.red}Cannot continue tests - server is not running${colors.reset}`);
        console.log(`${colors.gray}To start the server, run: npm start${colors.reset}`);
        process.exit(1);
    }

    results.manifest = await testManifest();
    results.health = await testHealthCheck();
    results.webui = await testWebUI();
    results.config = await testConfigFiles();
    results.cors = await testCORSHeaders();

    // Summary
    console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.blue}Test Summary${colors.reset}`);
    console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);

    const passed = Object.values(results).filter(r => r).length;
    const total = Object.keys(results).length;

    console.log(`Passed: ${passed}/${total}`);

    if (passed === total) {
        console.log(`${colors.green}✓ All tests passed!${colors.reset}\n`);
        console.log(`${colors.green}The addon is ready to use:${colors.reset}`);
        console.log(`${colors.gray}  - Manifest: ${BASE_URL}/manifest.json${colors.reset}`);
        console.log(`${colors.gray}  - Health: ${BASE_URL}/health${colors.reset}`);
        console.log(`${colors.gray}  - Web UI: ${BASE_URL}/${colors.reset}\n`);
        process.exit(0);
    } else {
        console.log(`${colors.red}✗ Some tests failed${colors.reset}\n`);
        process.exit(1);
    }
}

// Run tests
runTests().catch(error => {
    console.error(`${colors.red}Test runner error: ${error.message}${colors.reset}`);
    process.exit(1);
});
