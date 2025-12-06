const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const { scrapeContent } = require('../scrapers');

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
    return null;
});

// Stream handler
builder.defineStreamHandler(async (args) => {
    console.log('Stream request:', args);
    return { streams: [] };
});

// Create the router
const router = getRouter(builder.getInterface());

// Export the serverless function
module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Handle manifest request
    if (req.url === '/manifest.json' && req.method === 'GET') {
        return res.json(manifest);
    }

    // Handle health check
    if (req.url === '/health' && req.method === 'GET') {
        return res.json({ status: 'ok', version: manifest.version });
    }

    // Handle other requests
    try {
        await router(req, res, () => {
            if (!res.headersSent) {
                res.status(404).json({ error: 'Not Found' });
            }
        });
    } catch (error) {
        console.error('Error handling request:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
};
