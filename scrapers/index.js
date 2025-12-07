const axios = require('axios');
const cheerio = require('cheerio');
const memoize = require('memoizee');
const config = require('../config');
const { scrapeFlixPatrol } = require('./flixpatrol');

// Create a memoized version of the fetch function with caching
const memoizedFetch = memoize(
    async (url, options = {}) => {
        try {
            const response = await axios({
                url,
                method: options.method || 'GET',
                headers: {
                    'User-Agent': config.userAgent,
                    ...(options.headers || {})
                },
                timeout: config.requestTimeout,
                ...options
            });
            return response.data;
        } catch (error) {
            console.error(`Error fetching ${url}:`, error.message);
            return null;
        }
    },
    {
        promise: true,
        maxAge: config.cache.ttl,
        max: config.cache.max,
        normalizer: ([url, options]) => {
            // Create a cache key based on URL and options
            return JSON.stringify({ url, options: options || {} });
        }
    }
);

// Mock data for development - remove or update in production
const MOCK_CONTENT = {
    movie: [
        {
            id: 'indiaott:mock:movie:1',
            type: 'movie',
            name: 'RRR',
            poster: 'https://via.placeholder.com/300x450?text=RRR',
            posterShape: 'poster',
            description: 'An action drama film about two revolutionaries',
            genres: ['Action', 'Drama', 'South Indian'],
            releaseInfo: '2022',
            links: []
        },
        {
            id: 'indiaott:mock:movie:2',
            type: 'movie',
            name: 'KGF Chapter 2',
            poster: 'https://via.placeholder.com/300x450?text=KGF',
            posterShape: 'poster',
            description: 'A sequel to the Kannada action-thriller',
            genres: ['Action', 'Thriller', 'South Indian'],
            releaseInfo: '2022',
            links: []
        }
    ],
    series: [
        {
            id: 'indiaott:mock:series:1',
            type: 'series',
            name: 'Paatal Lok',
            poster: 'https://via.placeholder.com/300x450?text=PaatalLok',
            posterShape: 'poster',
            description: 'A gritty crime drama web series',
            genres: ['Crime', 'Drama'],
            releaseInfo: '2020',
            links: []
        }
    ]
};

/**
 * Scrape content from multiple OTT platforms
 * @param {string} type - Content type ('movie' or 'series')
 * @param {string} catalogId - Catalog ID
 * @returns {Promise<Array>} - Array of content items
 */
async function scrapeContent(type, catalogId) {
    console.log(`[scrapeContent] Fetching ${type} content for catalog: ${catalogId}`);
    

    let results = [];
    const contentPromises = [];


    // 1. Scrape FlixPatrol
    const flixPatrolPromise = scrapeFlixPatrol(type)
        .then(items => {
            console.log(`[scrapeContent] Got ${items.length} items from FlixPatrol`);
            results = results.concat(items);
        })
        .catch(error => {
            console.error(`[scrapeContent] Error scraping FlixPatrol:`, error.message);
        });
    contentPromises.push(flixPatrolPromise);

    // 2. Scrape API sources (placeholder)
    // Example: await scrapeApiSource(type)

    // 3. Scrape direct platforms (existing logic)
    const platformsToScrape = config.platforms.filter(platform => {
        if (catalogId === 'south-indian') {
            return ['aha', 'sun-nxt'].includes(platform.id);
        }
        return true;
    });
    for (const platform of platformsToScrape) {
        const url = `${platform.baseUrl}${type === 'movie' ? platform.moviePath : platform.seriesPath}`;
        contentPromises.push(
            scrapePlatform(platform, url, type)
                .then(items => {
                    console.log(`[scrapeContent] Got ${items.length} items from ${platform.name}`);
                    results = results.concat(items);
                })
                .catch(error => {
                    console.error(`[scrapeContent] Error scraping ${platform.name}:`, error.message);
                })
        );
    }

    // Wait for all scrapes to complete
    await Promise.allSettled(contentPromises);

    // Deduplicate by name + type
    const seen = new Set();
    results = results.filter(item => {
        const key = item.type + ':' + item.name;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    // If no results, use mock data
    if (results.length === 0) {
        console.log(`[scrapeContent] No content found, using mock data for ${type}`);
        results = (MOCK_CONTENT[type] || []);
    }

    // Sort by release date (newest first)
    return results.sort((a, b) => {
        const aYear = parseInt(a.releaseInfo) || 0;
        const bYear = parseInt(b.releaseInfo) || 0;
        return bYear - aYear;
    });
}

/**
 * Scrape content from a specific platform
 * @param {Object} platform - Platform configuration
 * @param {string} url - URL to scrape
 * @param {string} type - Content type
 * @returns {Promise<Array>} - Array of content items
 */
async function scrapePlatform(platform, url, type) {
    console.log(`[scrapePlatform] Scraping ${platform.name} from ${url}`);
    
    try {
        const html = await memoizedFetch(url);
        if (!html) {
            console.warn(`[scrapePlatform] No HTML content received from ${platform.name}`);
            return [];
        }

        const $ = cheerio.load(html);
        const items = [];

        // Try multiple selector patterns for different platforms
        const selectors = [
            '.content-item',
            '.tile',
            '.card',
            '[data-content-type]',
            '.movie-card',
            '.show-card',
            '.poster-container'
        ];

        for (const selector of selectors) {
            const elements = $(selector);
            if (elements.length > 0) {
                console.log(`[scrapePlatform] Found ${elements.length} items using selector: ${selector}`);
                
                elements.each((i, el) => {
                    const $el = $(el);
                    const title = $el.find('h3, h4, .title, .name, [itemprop="name"]').first().text().trim();
                    const image = $el.find('img').attr('src') || 
                                 $el.find('img').attr('data-src') || 
                                 $el.find('img').attr('data-image');
                    const link = $el.find('a').first().attr('href');
                    
                    if (title && image) {
                        items.push({
                            id: `indiaott:${platform.id}:${type}:${i}`,
                            type,
                            name: title,
                            poster: image.startsWith('http') ? image : `${platform.baseUrl}${image}`,
                            posterShape: 'poster',
                            description: $el.find('.description, .synopsis, .overview').text().trim(),
                            genres: $el.find('.genre, .categories, [itemprop="genre"]')
                                .text()
                                .trim()
                                .split(',')
                                .map(g => g.trim())
                                .filter(g => g.length > 0),
                            releaseInfo: $el.find('.year, .release-date, [itemprop="datePublished"]').text().trim(),
                            links: link ? [{
                                url: link.startsWith('http') ? link : `${platform.baseUrl}${link}`,
                                name: `Watch on ${platform.name}`
                            }] : []
                        });
                    }
                });
                
                // If we found items, return them
                if (items.length > 0) {
                    return items;
                }
            }
        }

        if (items.length === 0) {
            console.warn(`[scrapePlatform] No items found on ${platform.name} using any selector`);
        }

        return items;
    } catch (error) {
        console.error(`[scrapePlatform] Error scraping ${platform.name}:`, error.message);
        return [];
    }
}

module.exports = {
    scrapeContent,
    // Export for testing
    _scrapePlatform: scrapePlatform,
    _getMockContent: () => MOCK_CONTENT
};
