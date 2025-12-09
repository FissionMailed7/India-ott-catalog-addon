const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const fetch = require('node-fetch');
const { scrapeContent } = require('../scrapers');

// Cache for scraped content
const contentCache = new Map();
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

const builder = new addonBuilder({
  id: 'com.south-indian-ott-catalog',
  version: '1.0.0',
  name: 'South Indian OTT Catalog',
  catalogs: [
    {
      type: 'movie',
      id: 'south-indian-movies',
      name: 'South Indian Movies'
    },
    {
      type: 'series',
      id: 'south-indian-series',
      name: 'South Indian Series'
    }
  ],
  resources: ['catalog', 'meta'],
  types: ['movie', 'series'],
  idPrefixes: ['indiaott:']
});

builder.defineCatalogHandler(async ({ type, id }) => {
  console.log(`Request for ${type} catalog: ${id}`);

  const cacheKey = `${type}-${id}`;
  const cached = contentCache.get(cacheKey);

  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log(`Serving cached content for ${cacheKey}`);
    return Promise.resolve({ metas: cached.metas });
  }

  try {
    const content = await scrapeContent(type, id);
    const metas = content.map(item => ({
      id: item.id,
      type: item.type,
      name: item.name,
      poster: item.poster,
      posterShape: item.posterShape,
      description: item.description,
      genres: item.genres,
      releaseInfo: item.releaseInfo
    }));

    // Cache the result
    contentCache.set(cacheKey, {
      metas,
      timestamp: Date.now()
    });

    return Promise.resolve({ metas });
  } catch (error) {
    console.error(`Error fetching ${type} catalog:`, error.message);
    return Promise.resolve({ metas: [] });
  }
});

builder.defineMetaHandler((args) => {
  console.log('Meta request:', args);
  return Promise.resolve({ meta: null });
});

const router = getRouter(builder.getInterface());

function setHeaders(res, contentType = 'application/json') {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, X-Requested-With');
  res.setHeader('Content-Type', `${contentType}; charset=utf-8`);
  res.setHeader('Cache-Control', 'public, max-age=3600');
}

module.exports = async (req, res) => {
  setHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
if (req.url === '/manifest.json' || req.url === '/') {
  const fs = require('fs');
  const path = require('path');
  const manifestPath = path.join(__dirname, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  return res.status(200).end(JSON.stringify(manifest, null, 2));
}

    return router(req, res, () => {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Not Found' }));
    });
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Server Error' }));
  }
};
