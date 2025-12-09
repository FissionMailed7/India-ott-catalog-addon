module.exports = {
    // Cache settings (in milliseconds)
    cache: {
        ttl: 6 * 60 * 60 * 1000, // 6 hours
        max: 1000 // Maximum number of items to cache
    },
    
    // List of OTT platforms to scrape
    platforms: [
        {
            id: 'aha',
            name: 'Aha',
            baseUrl: 'https://www.aha.video',
            moviePath: '/movies',
            seriesPath: '/web-series',
            language: ['Telugu', 'Tamil', 'Kannada', 'Malayalam', 'Hindi']
        },
        {
            id: 'hotstar',
            name: 'Disney+ Hotstar',
            baseUrl: 'https://www.hotstar.com',
            moviePath: '/movies',
            seriesPath: '/tv',
            language: ['Hindi', 'English', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Bengali', 'Marathi']
        },
        {
            id: 'sonyliv',
            name: 'SonyLIV',
            baseUrl: 'https://www.sonyliv.com',
            moviePath: '/movies',
            seriesPath: '/tv-shows',
            language: ['Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Bengali', 'Marathi']
        },
        {
            id: 'zee5',
            name: 'ZEE5',
            baseUrl: 'https://www.zee5.com',
            moviePath: '/movies',
            seriesPath: '/web-series',
            language: ['Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Bengali', 'Marathi']
        },
        {
            id: 'sun-nxt',
            name: 'Sun NXT',
            baseUrl: 'https://www.sun-nxt.com',
            moviePath: '/movies',
            seriesPath: '/shows',
            language: ['Tamil', 'Telugu', 'Kannada', 'Malayalam']
        }
    ],
    
    // User agent to use for scraping
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    
    // Request timeout in milliseconds
    requestTimeout: 10000,

    // TMDB API configuration
    // Get your free API key from: https://www.themoviedb.org/settings/api
    // Set TMDB_API_KEY environment variable or replace the key below
    tmdb: {
        apiKey: process.env.TMDB_API_KEY || '7f61bc0d51bd23329dcc1b50fa611b8f', // Your TMDB API key
        baseUrl: 'https://api.themoviedb.org/3',
        imageBaseUrl: 'https://image.tmdb.org/t/p',
        posterSize: 'w500', // w92, w154, w185, w342, w500, w780, original
        backdropSize: 'w780',
        language: 'en-US',
        region: 'IN' // India region for better results
    },

    // Debrid services configuration
    debrid: {
        // Set your API keys as environment variables
        realDebrid: {
            apiKey: process.env.REAL_DEBRID_API_KEY || '',
            baseUrl: 'https://api.real-debrid.com/rest/1.0'
        },
        torbox: {
            apiKey: process.env.TORBOX_API_KEY || '',
            baseUrl: 'https://api.torbox.app/v1/api'
        },
        allDebrid: {
            apiKey: process.env.ALL_DEBRID_API_KEY || '',
            baseUrl: 'https://api.alldebrid.com/v4'
        },
        premiumize: {
            apiKey: process.env.PREMIUMIZE_API_KEY || '',
            baseUrl: 'https://www.premiumize.me/api'
        },
        // Enable/disable services
        enabledServices: ['realDebrid', 'torbox', 'allDebrid', 'premiumize']
    }
};
