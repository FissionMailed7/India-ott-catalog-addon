const axios = require('axios');
const cheerio = require('cheerio');
const memoize = require('memoizee');
const config = require('../config');
const { scrapeFlixPatrol } = require('./flixpatrol');
const tmdbService = require('./tmdb');

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

// Mock data for South Indian content - used as fallback when scraping fails
const MOCK_CONTENT = {
    movie: [
        {
            id: 'indiaott:mock:movie:1',
            type: 'movie',
            name: 'RRR',
            poster: 'https://via.placeholder.com/300x450?text=RRR',
            posterShape: 'poster',
            description: 'An epic action drama about two revolutionaries in 1920s India fighting against British oppression',
            genres: ['Action', 'Drama', 'South Indian', 'Telugu', 'Historical'],
            releaseInfo: '2022',
            links: []
        },
        {
            id: 'indiaott:mock:movie:2',
            type: 'movie',
            name: 'KGF Chapter 2',
            poster: 'https://via.placeholder.com/300x450?text=KGF+2',
            posterShape: 'poster',
            description: 'Rocky embarks on a quest to become the wealthiest man in the world, continuing his blood-soaked campaign',
            genres: ['Action', 'Thriller', 'South Indian', 'Kannada'],
            releaseInfo: '2022',
            links: []
        },
        {
            id: 'indiaott:mock:movie:3',
            type: 'movie',
            name: 'Ponniyin Selvan: I',
            poster: 'https://via.placeholder.com/300x450?text=PS1',
            posterShape: 'poster',
            description: 'A historical epic based on Kalki Krishnamurthy\'s novel about the Chola dynasty',
            genres: ['Drama', 'Historical', 'South Indian', 'Tamil'],
            releaseInfo: '2022',
            links: []
        },
        {
            id: 'indiaott:mock:movie:4',
            type: 'movie',
            name: 'Oh My Dog',
            poster: 'https://via.placeholder.com/300x450?text=Oh+My+Dog',
            posterShape: 'poster',
            description: 'A heartwarming story of a man who can talk to dogs, directed by Sarov Shanmugam',
            genres: ['Comedy', 'Drama', 'South Indian', 'Tamil'],
            releaseInfo: '2022',
            links: []
        }
    ],
    series: [
        {
            id: 'indiaott:mock:series:1',
            type: 'series',
            name: 'Sacred Games',
            poster: 'https://via.placeholder.com/300x450?text=Sacred+Games',
            posterShape: 'poster',
            description: 'A link in their pasts leads an honest cop to a fugitive gangster',
            genres: ['Crime', 'Drama', 'Thriller'],
            releaseInfo: '2018',
            links: []
        },
        {
            id: 'indiaott:mock:series:2',
            type: 'series',
            name: 'Mirzapur',
            poster: 'https://via.placeholder.com/300x450?text=Mirzapur',
            posterShape: 'poster',
            description: 'A shocking incident at a wedding procession ignites a series of events entangling the lives',
            genres: ['Crime', 'Drama', 'Thriller'],
            releaseInfo: '2018',
            links: []
        },
        {
            id: 'indiaott:mock:series:3',
            type: 'series',
            name: 'Gandii Baat',
            poster: 'https://via.placeholder.com/300x450?text=Gandii+Baat',
            posterShape: 'poster',
            description: 'The bizarre, funny and heartwarming stories from the lives of 4 Gujarati families',
            genres: ['Comedy', 'Drama'],
            releaseInfo: '2018',
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

    // Enrich content with TMDB metadata (posters, descriptions, etc.)
    console.log(`[scrapeContent] Enriching ${results.length} items with TMDB metadata`);
    try {
        results = await tmdbService.enrichContent(results);
        console.log(`[scrapeContent] Successfully enriched content with TMDB data`);
    } catch (error) {
        console.error(`[scrapeContent] Error enriching content with TMDB:`, error.message);
        // Continue with unenriched data if TMDB fails
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
