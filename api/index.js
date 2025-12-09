const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const express = require('express');
const { scrapeContent } = require('../scrapers');
const tmdbService = require('../scrapers/tmdb');
const debridService = require('../scrapers/debrid');

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
  resources: ['catalog', 'meta', 'stream'],
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

// Meta handler - provides detailed metadata for content
builder.defineMetaHandler(async (args) => {
  console.log('Meta request:', args);

  try {
    const { id, type } = args;
    const indiaottPrefix = 'indiaott:';

    // Only handle our content
    if (!id.startsWith(indiaottPrefix)) {
      return { meta: null };
    }

    // Extract TMDB ID from our custom ID format
    const tmdbMatch = id.match(/indiaott:tmdb:(\w+):(\d+)/);
    if (!tmdbMatch) {
      return { meta: null };
    }

    const [, contentType, tmdbId] = tmdbMatch;
    const tmdbType = contentType === 'movie' ? 'movie' : 'tv';

    // Get detailed info from TMDB
    const details = await tmdbService.getDetails(parseInt(tmdbId), tmdbType);

    if (!details) {
      return { meta: null };
    }

    // Format for Stremio
    const meta = {
      id: id,
      type: type,
      name: details.title || details.name,
      poster: tmdbService.getPosterUrl(details.poster_path),
      background: tmdbService.getBackdropUrl(details.backdrop_path),
      description: details.overview,
      genres: details.genres ? details.genres.map(g => g.name) : [],
      releaseInfo: tmdbType === 'movie'
        ? (details.release_date ? new Date(details.release_date).getFullYear().toString() : '')
        : (details.first_air_date ? new Date(details.first_air_date).getFullYear().toString() : ''),
      imdbRating: details.vote_average ? details.vote_average.toString() : null,
      runtime: tmdbType === 'movie' && details.runtime ? `${details.runtime} min` : null,
      language: details.original_language,
      country: details.origin_country ? details.origin_country[0] : null
    };

    // Add series-specific info
    if (tmdbType === 'tv') {
      meta.status = details.status;
      meta.numberOfSeasons = details.number_of_seasons;
      meta.seasons = details.seasons ? details.seasons.map(season => ({
        season: season.season_number,
        title: season.name,
        episodeCount: season.episode_count,
        airDate: season.air_date,
        description: season.overview,
        poster: tmdbService.getPosterUrl(season.poster_path)
      })) : [];
    }

    console.log(`Meta response for ${id}: ${meta.name}`);
    return { meta };

  } catch (error) {
    console.error('Meta handler error:', error.message);
    return { meta: null };
  }
});

// Stream handler - provides streaming URLs from debrid services
builder.defineStreamHandler(async (args) => {
  console.log('Stream request:', args);

  try {
    const { id, type } = args;
    const indiaottPrefix = 'indiaott:';

    // Only handle our content
    if (!id.startsWith(indiaottPrefix)) {
      return { streams: [] };
    }

    // Extract TMDB ID and content info
    const tmdbMatch = id.match(/indiaott:tmdb:(\w+):(\d+)/);
    if (!tmdbMatch) {
      return { streams: [] };
    }

    const [, contentType, tmdbId] = tmdbMatch;
    const tmdbType = contentType === 'movie' ? 'movie' : 'tv';

    // Get basic info from TMDB
    const details = await tmdbService.getDetails(parseInt(tmdbId), tmdbType);

    if (!details) {
      return { streams: [] };
    }

    // Build search query
    let query = details.title || details.name;
    const year = tmdbType === 'movie'
      ? (details.release_date ? new Date(details.release_date).getFullYear() : null)
      : (details.first_air_date ? new Date(details.first_air_date).getFullYear() : null);

    if (year) {
      query += ` ${year}`;
    }

    // Extract season/episode info for TV shows
    let season = null;
    let episode = null;

    if (type === 'series' && args.season && args.episode) {
      season = parseInt(args.season);
      episode = parseInt(args.episode);
      query += ` S${season.toString().padStart(2, '0')}E${episode.toString().padStart(2, '0')}`;
    }

    console.log(`Searching streams for: "${query}"`);

    // Search for streams across all debrid services
    const streams = await debridService.searchStreams(query, tmdbType, season, episode);

    console.log(`Found ${streams.length} streams for ${query}`);
    return { streams };

  } catch (error) {
    console.error('Stream handler error:', error.message);
    return { streams: [] };
  }
});

const app = express();
const router = getRouter(builder.getInterface());

// Middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, X-Requested-With');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  next();
});

// Routes
app.get('/manifest.json', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const manifestPath = path.join(__dirname, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  res.json(manifest);
});

app.get('/', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const manifestPath = path.join(__dirname, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  res.json(manifest);
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Use Stremio router
app.use(router);

// Export for Dokku deployment (don't call app.listen)
module.exports = app;

// Only start server if running locally (not in Dokku)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`South Indian OTT Catalog addon listening on port ${PORT}`);
  });
}
