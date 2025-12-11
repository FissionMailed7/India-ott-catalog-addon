const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const express = require('express');
const { scrapeContent } = require('../scrapers');
const tmdbService = require('../scrapers/tmdb');
const debridService = require('../scrapers/debrid');

// Cache for scraped content
const contentCache = new Map();
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

const builder = new addonBuilder({
  id: 'com.underrated-thrillers',
  version: '1.0.1',
  name: 'Underrated Thriller Gems',
  description: 'Handpicked collection of the most underrated and overlooked thriller movies that deserve more attention',
  catalogs: [
    {
      type: 'movie',
      id: 'hidden-gem-thrillers',
      name: 'Hidden Gem Thrillers',
      genres: ['Thriller', 'Underrated', 'Suspense', 'Psychological']
    },
    {
      type: 'movie',
      id: 'mind-bending-thrillers',
      name: 'Mind-Bending Thrillers',
      genres: ['Thriller', 'Psychological', 'Mindfuck', 'Mystery']
    },
    {
      type: 'movie',
      id: 'indie-thrillers',
      name: 'Indie Thrillers',
      genres: ['Thriller', 'Indie', 'Suspense', 'Drama']
    },
    {
      type: 'movie',
      id: 'foreign-thrillers',
      name: 'Foreign Thrillers',
      genres: ['Thriller', 'Foreign', 'Suspense', 'International']
    },
    {
      type: 'movie',
      id: 'neo-noir',
      name: 'Neo-Noir Gems',
      genres: ['Noir', 'Thriller', 'Crime', 'Mystery']
    },
    {
      type: 'movie',
      id: 'slow-burn-thrillers',
      name: 'Slow Burn Thrillers',
      genres: ['Noir', 'Classic', 'Crime', 'Thriller']
    }
  ],
  resources: ['catalog', 'meta'],
  types: ['movie', 'series'],
  idPrefixes: ['thriller:']
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
    const thrillerPrefix = 'thriller:';

    let meta = null;

    // Handle title:year format IDs (e.g., "RRR:2022")
    if (id.includes(':') && !id.startsWith('thriller:')) {
      const parts = id.split(':');
      const title = parts[0].replace(/_/g, ' ').trim();
      const year = parts[1] ? parseInt(parts[1]) : null;

      try {
        // Search TMDB for this title
        const searchType = type === 'movie' ? 'movie' : 'tv';
        const tmdbResult = await tmdbService.search(title, searchType, year);

        if (tmdbResult) {
          const details = await tmdbService.getDetails(tmdbResult.id, searchType);
          if (details) {
            meta = tmdbService.formatForStremio(details, type, title);
            meta.id = id; // Keep the title:year ID
            console.log(`[Meta] Found TMDB data for "${title}" (${year})`);
          }
        }

        // If TMDB search fails, create basic metadata
        if (!meta) {
          meta = {
            id: id,
            type: type,
            name: title,
            poster: 'https://via.placeholder.com/300x450?text=' + encodeURIComponent(title),
            posterShape: 'poster',
            description: `Discover this critically acclaimed ${type} from around the world`,
            genres: ['Thriller', 'Mystery', 'Suspense'],
            releaseInfo: year ? year.toString() : new Date().getFullYear().toString()
          };
          console.log(`[Meta] Using basic metadata for "${title}"`);
        }
      } catch (error) {
        console.error(`[Meta] Error handling title:year ID ${id}:`, error.message);
        // Fallback metadata
        meta = {
          id: id,
          type: type,
          name: title || 'Unknown Title',
          poster: 'https://via.placeholder.com/300x450?text=' + encodeURIComponent(title || 'Unknown'),
          posterShape: 'poster',
          description: `Discover this critically acclaimed ${type} from around the world`,
          genres: ['Thriller', 'Mystery', 'Suspense'],
          releaseInfo: new Date().getFullYear().toString()
        };
      }
    }
    // Handle our traditional thriller: prefixed IDs
    else if (id.startsWith(thrillerPrefix)) {
      // Try TMDB ID format first: thriller:tmdb:movie:123
      const tmdbMatch = id.match(/thriller:tmdb:(\w+):(\d+)/);
      if (tmdbMatch) {
        const [, contentType, tmdbId] = tmdbMatch;
        const tmdbType = contentType === 'movie' ? 'movie' : 'tv';

        // Get detailed info from TMDB
        const details = await tmdbService.getDetails(parseInt(tmdbId), tmdbType);

        if (details) {
          // Format for Stremio
          meta = {
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
        }
      }

      // If TMDB failed or not a TMDB ID, try to create basic metadata from the ID
      if (!meta) {
        // Handle other ID formats like indiaott:mock:movie:1 or indiaott:aha:movie:0
        const parts = id.split(':');
        if (parts.length >= 3) {
          const contentType = parts[2]; // movie or series
          const contentName = parts.slice(3).join(' ') || 'Unknown Title';

          // Try to search TMDB with the available information
          try {
            const searchType = contentType === 'movie' ? 'movie' : 'tv';
            const tmdbResult = await tmdbService.search(contentName, searchType);

            if (tmdbResult) {
              const details = await tmdbService.getDetails(tmdbResult.id, searchType);
              if (details) {
                meta = tmdbService.formatForStremio(details, type, contentName);
                meta.id = id; // Keep original ID
              }
            }
          } catch (error) {
            console.error(`[Meta] TMDB search failed for ${contentName}:`, error.message);
          }

          // If TMDB still fails, create basic metadata
          if (!meta) {
            meta = {
              id: id,
              type: type,
              name: contentName.replace(/^\d+\s*/, ''), // Remove leading numbers
              poster: 'https://via.placeholder.com/300x450?text=' + encodeURIComponent(contentName),
              posterShape: 'poster',
              description: `Discover this critically acclaimed ${contentName} from around the world`,
              genres: ['Thriller', 'Mystery', 'Suspense'],
              releaseInfo: new Date().getFullYear().toString()
            };
          }
        }
      }
    }
    // Don't handle other ID formats
    else {
      return { meta: null };
    }

    if (meta) {
      console.log(`Meta response for ${id}: ${meta.name}`);
      return { meta };
    } else {
      console.warn(`No metadata found for ${id}`);
      return { meta: null };
    }

  } catch (error) {
    console.error('Meta handler error:', error.message);
    return { meta: null };
  }
});

// Note: This addon does NOT provide streams - it only provides catalog and metadata
// Streams are provided by other addons in Stremio (torrentio, mediafusion, etc.)

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
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Use Stremio router (handles /manifest.json automatically)
app.use(router);

// Export for Dokku deployment (don't call app.listen)
module.exports = app;

// Only start server if running locally (not in Dokku)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Global Hidden Gems: Thrillers addon listening on port ${PORT}`);
  });
}
