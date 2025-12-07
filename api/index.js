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
    console.log(`[Catalog] Request for ${type} catalog: ${id}`);
    try {
        console.log(`[Catalog] Fetching content for ${type} with ID: ${id}`);
        let content = [];
        
        try {
            content = await scrapeContent(type, id);
        } catch (scrapeError) {
            console.error('[Catalog] Error in scrapeContent:', scrapeError);
            // Fallback to test data if scraping fails
            content = [{
                id: `indiaott:${type}:test-1`,
                type: type,
                name: `Test ${type === 'movie' ? 'Movie' : 'Series'} 1`,
                poster: type === 'movie' 
                    ? 'https://via.placeholder.com/300x450?text=Test+Movie' 
                    : 'https://via.placeholder.com/300x450?text=Test+Series',
                posterShape: 'poster',
                description: 'This is a test item. The actual scraper failed to fetch data.',
                genres: ['Test'],
                releaseInfo: '2023',
                links: [{ url: 'https://example.com', name: 'Example' }]
            }];
        }
        
        // Ensure content is an array
        if (!Array.isArray(content)) {
            console.error('[Catalog] Content is not an array:', content);
            content = [];
        }
        
        // Log the first item for debugging
        if (content.length > 0) {
            console.log(`[Catalog] First item in response:`, JSON.stringify(content[0], null, 2));
        } else {
            console.log(`[Catalog] No content returned for ${type}/${id}`);
            // Add a test item if no content is available
            content = [{
                id: `indiaott:${type}:test-1`,
                type: type,
                name: `Test ${type === 'movie' ? 'Movie' : 'Series'} 1`,
                poster: type === 'movie' 
                    ? 'https://via.placeholder.com/300x450?text=Test+Movie' 
                    : 'https://via.placeholder.com/300x450?text=Test+Series',
                posterShape: 'poster',
                description: 'This is a test item. No content was available.',
                genres: ['Test'],
                releaseInfo: '2023'
            }];
        }
        
        // Ensure all items have required fields
        const validatedContent = content.map(item => ({
            id: item.id || `indiaott:${type}:${Math.random().toString(36).substr(2, 9)}`,
            type: item.type || type,
            name: item.name || 'Untitled',
            poster: item.poster || (type === 'movie' 
                ? 'https://via.placeholder.com/300x450?text=No+Poster' 
                : 'https://via.placeholder.com/300x450?text=No+Poster'),
            posterShape: item.posterShape || 'poster',
            description: item.description || 'No description available.',
            genres: Array.isArray(item.genres) ? item.genres : ['Uncategorized'],
            releaseInfo: item.releaseInfo || 'N/A',
            links: Array.isArray(item.links) ? item.links : []
        }));
        
        console.log(`[Catalog] Returning ${validatedContent.length} items`);
        return { metas: validatedContent };
    } catch (error) {
        console.error('[Catalog] Error in catalog handler:', error);
        console.error(error.stack);
        // Return a test item even in case of error
        return {
            metas: [{
                id: `indiaott:${type || 'unknown'}:error-${Date.now()}`,
                type: type || 'movie',
                name: 'Error Loading Content',
                poster: 'https://via.placeholder.com/300x450?text=Error+Loading',
                posterShape: 'poster',
                description: 'There was an error loading the content. Please check the logs for more information.',
                genres: ['Error'],
                releaseInfo: 'N/A'
            }]
        };
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
