const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const fetch = require('node-fetch');

// Simple in-memory catalog
const popularMovies = {
  metas: [
    {
      id: 'simple-movie-1',
      type: 'movie',
      name: 'The Shawshank Redemption',
      poster: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg',
      posterShape: 'poster',
      description: 'Framed in the 1940s for the double murder of his wife and her lover, upstanding banker Andy Dufresne begins a new life at the Shawshank prison, where he puts his accounting skills to work for an amoral warden. During his long stretch in prison, Dufresne comes to be admired by the other inmates -- including an older prisoner named Red -- for his integrity and unquenchable sense of hope.',
      genres: ['Drama', 'Crime'],
      releaseInfo: '1994',
      imdbRating: '9.3',
      runtime: '142 min'
    },
    {
      id: 'simple-movie-2',
      type: 'movie',
      name: 'The Godfather',
      poster: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
      posterShape: 'poster',
      description: 'Spanning the years 1945 to 1955, a chronicle of the fictional Italian-American Corleone crime family. When organized crime family patriarch, Don Vito Corleone barely survives an attempt on his life, his youngest son, Michael steps in to take care of the would-be killers, launching a campaign of bloody revenge.',
      genres: ['Drama', 'Crime'],
      releaseInfo: '1972',
      imdbRating: '9.2',
      runtime: '175 min'
    }
  ]
};

const builder = new addonBuilder({
  id: 'com.simple-movie-catalog',
  version: '1.0.0',
  name: 'Simple Movie Catalog',
  catalogs: [{
    type: 'movie',
    id: 'popular-movies',
    name: 'Popular Movies'
  }],
  resources: ['catalog'],
  types: ['movie'],
  idPrefixes: ['simple-movie-']
});

builder.defineCatalogHandler(({ type, id }) => {
  console.log(`Request for ${type} catalog: ${id}`);
  return Promise.resolve(popularMovies);
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
      return res.status(200).end(JSON.stringify({
        id: 'com.simple-movie-catalog',
        version: '1.0.0',
        name: 'Simple Movie Catalog',
        catalogs: [{
          type: 'movie',
          id: 'popular-movies',
          name: 'Popular Movies',
          genres: ['Popular']
        }],
        resources: ['catalog'],
        types: ['movie'],
        idPrefixes: ['simple-movie-']
      }, null, 2));
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
