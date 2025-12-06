const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const { scrapeContent } = require('../scrapers');
const fs = require('fs');
const path = require('path');

// HTML content for the root URL
const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <title>India OTT Catalog</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px; 
            margin: 0;
            background-color: #f5f5f5;
        }
        h1 { 
            color: #333; 
            margin-bottom: 30px;
        }
        .addon-url { 
            margin: 20px auto; 
            padding: 12px; 
            width: 80%; 
            max-width: 500px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 16px;
            text-align: center;
        }
        .test-link { 
            display: inline-block; 
            margin: 15px; 
            padding: 12px 24px; 
            background: #0070f3; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px;
            font-weight: bold;
            transition: background-color 0.3s;
        }
        .test-link:hover {
            background: #005bb5;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 30px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .links {
            margin-top: 30px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>India OTT Catalog Addon</h1>
        <p>Add this URL to Stremio to access Indian OTT content:</p>
        <input type="text" id="addonUrl" class="addon-url" readonly>
        <div class="links">
            <a href="/manifest.json" class="test-link" target="_blank">View Manifest</a>
            <a href="/health" class="test-link" target="_blank">Health Check</a>
        </div>
    </div>
    <script>
        document.getElementById('addonUrl').value = window.location.origin + '/manifest.json';
    </script>
</body>
</html>`;

// Load manifest from file
let manifest;
try {
    const manifestPath = path.join(__dirname, 'manifest.json');
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (error) {
    console.error('Error loading manifest.json:', error);
    // Fallback manifest
    manifest = {
        id: 'com.indiaottcatalog.addon',
        version: '1.0.0',
        name: 'India OTT Catalog',
        description: 'A Stremio addon for Indian OTT content',
        types: ['movie', 'series'],
        catalogs: [],
        resources: ['catalog', 'meta', 'stream'],
        idPrefixes: ['indiaott:']
    };
}

const builder = new addonBuilder(manifest);

// Handlers
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

builder.defineMetaHandler(async (args) => {
    console.log('Meta request:', args);
    return null;
});

builder.defineStreamHandler(async (args) => {
    console.log('Stream request:', args);
    return { streams: [] };
});

const router = getRouter(builder.getInterface());

// Helper function to set common headers
function setHeaders(res, contentType = 'application/json') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', `${contentType}; charset=utf-8`);
    res.setHeader('Cache-Control', 'public, max-age=300');
}

// Export the serverless function
module.exports = async (req, res) => {
    // Set common headers
    setHeaders(res);
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Handle requests
    try {
        // Serve static manifest.json
        if (req.url === '/manifest.json' || req.url.endsWith('manifest.json')) {
            console.log('Serving manifest.json');
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            return res.status(200).end(JSON.stringify(manifest, null, 2));
        }

        // Handle root URL
        if (req.url === '/' || req.url === '') {
            setHeaders(res, 'text/html');
            return res.status(200).end(htmlContent);
        }

        // Handle health check
        if (req.url === '/health' || req.url.endsWith('/health')) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            return res.status(200).end(JSON.stringify({ 
                status: 'ok', 
                version: manifest.version,
                timestamp: new Date().toISOString()
            }));
        }

        // Handle other API requests through router
        return router(req, res, () => {
            if (!res.headersSent) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ 
                    error: 'Not Found',
                    message: 'Endpoint not found'
                }));
            }
        });
    } catch (error) {
        console.error('Error handling request:', error);
        if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ 
                error: 'Internal Server Error',
                message: error.message,
                timestamp: new Date().toISOString()
            }));
        }
    }
};
