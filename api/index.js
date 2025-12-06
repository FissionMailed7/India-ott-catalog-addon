const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const { scrapeContent } = require('../scrapers');

// HTML content for the root URL
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>India OTT Catalog</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        h1 { color: #333; }
        .addon-url { 
            margin: 20px 0; 
            padding: 10px; 
            width: 80%; 
            max-width: 500px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .test-link { 
            display: inline-block; 
            margin: 10px; 
            padding: 10px 20px; 
            background: #0070f3; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
        }
        .test-link:hover {
            background: #005bb5;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>India OTT Catalog Addon</h1>
        <p>Add this URL to Stremio to access Indian OTT content:</p>
        <input type="text" id="addonUrl" class="addon-url" readonly>
        <div>
            <a href="/manifest.json" class="test-link" target="_blank">View Manifest</a>
            <a href="/health" class="test-link" target="_blank">Health Check</a>
        </div>
    </div>
    <script>
        document.getElementById('addonUrl').value = window.location.origin + '/manifest.json';
    </script>
</body>
</html>
`;

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

    // Handle root URL
    if (req.url === '/' && req.method === 'GET') {
        res.setHeader('Content-Type', 'text/html');
        return res.send(htmlContent);
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