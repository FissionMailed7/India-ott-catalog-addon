const express = require('express');
const cors = require('cors');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const { scrapeContent } = require('./scrapers');

const app = express();
const PORT = process.env.PORT || 7000;

// Enable CORS for all routes
app.use(cors());

// Define the addon manifest
const manifest = {
    id: 'com.indiaottcatalog.addon',
    version: '1.0.0',
    name: 'India OTT Catalog',
    description: 'A Stremio addon for Indian OTT content including South Indian movies and Aha OTT',
    types: ['movie', 'series'],
    catalogs: [
        {
            type: 'movie',
            id: 'indian-movies',
            name: 'Indian Movies',
            genres: ['Indian', 'Bollywood', 'South Indian', 'Tollywood', 'Kollywood', 'Mollywood', 'Sandwood']
        },
        {
            type: 'series',
            id: 'indian-series',
            name: 'Indian Series',
            genres: ['Indian', 'Bollywood', 'South Indian', 'Tollywood', 'Kollywood', 'Mollywood', 'Sandwood']
        }
    ],
    resources: ['catalog', 'meta', 'stream'],
    idPrefixes: ['indiaott:']
};

const builder = new addonBuilder(manifest);

// Catalog handler
builder.defineCatalogHandler(async ({ type, id, extra }) => {
    console.log(`Request for ${type} catalog: ${id}`);
    
    try {
        const content = await scrapeContent(type, id);
        return { metas: content };
    } catch (error) {
        console.error('Error in catalog handler:', error);
        return { metas: [] };
    }
});

// Meta handler
builder.defineMetaHandler(async (args) => {
    console.log('Meta request:', args);
    // This would be implemented to return detailed metadata
    return null;
});

// Stream handler
builder.defineStreamHandler(async (args) => {
    console.log('Stream request:', args);
    // This would be implemented to return streaming links
    return Promise.resolve({ streams: [] });
});

// Add the addon routes
app.use('/', getRouter(builder.getInterface()));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', version: manifest.version });
});

// Start the server
app.listen(PORT, () => {
    console.log(`India OTT Catalog Addon running on http://localhost:${PORT}`);
    console.log(`Add this to Stremio: http://localhost:${PORT}/manifest.json`);
});

module.exports = { builder };

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);});
