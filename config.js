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
    requestTimeout: 10000
};
