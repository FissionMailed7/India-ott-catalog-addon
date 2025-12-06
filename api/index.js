const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const { scrapeContent } = require('../scrapers');
const fs = require('fs');
const path = require('path');

// HTML content for the root URL
const htmlContent = `
<!DOCTYPE html>
<html>
<!-- Previous HTML content remains the same -->
</html>
`;

// Load manifest from file
const manifestPath = path.join(__dirname, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const builder = new addonBuilder(manifest);

// Handlers remain the same as before
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
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', `${contentType}; charset=utf-8`);
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
        if (req.url === '/manifest.json' && req.method === 'GET') {
            console.log('Serving manifest.json');
            return res.end(JSON.stringify(manifest, null, 2));
        }

        // Handle root URL
        if (req.url === '/' && req.method === 'GET') {
            setHeaders(res, 'text/html');
            return res.end(htmlContent);
        }

        // Handle health check
        if (req.url === '/health' && req.method === 'GET') {
            return res.end(JSON.stringify({ status: 'ok', version: manifest.version }));
        }

        // Handle other API requests
        await router(req, res, () => {
            if (!res.headersSent) {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: 'Not Found' }));
            }
        });
    } catch (error) {
        console.error('Error handling request:', error);
        if (!res.headersSent) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Internal Server Error' }));
        }
    }
};
