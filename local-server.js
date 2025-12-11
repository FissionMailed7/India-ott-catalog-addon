const express = require('express');
const path = require('path');
const cors = require('cors');

// Import the serverless API handler
const apiHandler = require('./api/index.js');

const app = express();
const PORT = process.env.PORT || 7000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname)));

// Mount the API routes
app.use('/', apiHandler);

// Start the server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ India OTT Catalog Addon running on http://localhost:${PORT}`);
    console.log(`✓ Add this URL to Stremio: http://localhost:${PORT}/manifest.json`);
    console.log(`✓ Health check: http://localhost:${PORT}/health`);
    console.log(`✓ Web UI: http://localhost:${PORT}/`);
});
