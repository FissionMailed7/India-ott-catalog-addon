const axios = require('axios');
const cheerio = require('cheerio');
const memoize = require('memoizee');
const config = require('../config');

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
            return JSON.stringify({ url, options });
        }
    }
);

/**
 * Scrape content from multiple OTT platforms
 * @param {string} type - Content type ('movie' or 'series')
 * @param {string} catalogId - Catalog ID
 * @returns {Promise<Array>} - Array of content items
 */
async function scrapeContent(type, catalogId) {
    const results = [];
    const contentPromises = [];

    // Filter platforms based on catalog ID if needed
    const platformsToScrape = config.platforms.filter(platform => {
        if (catalogId === 'south-indian') {
            return ['aha', 'sun-nxt'].includes(platform.id);
        }
        return true;
    });

    // Create promises for each platform
    for (const platform of platformsToScrape) {
        const url = `${platform.baseUrl}${type === 'movie' ? platform.moviePath : platform.seriesPath}`;
        contentPromises.push(
            scrapePlatform(platform, url, type)
                .then(items => {
                    results.push(...items);
                })
                .catch(error => {
                    console.error(`Error scraping ${platform.name}:`, error.message);
                })
        );
    }

    // Wait for all platform scrapes to complete
    await Promise.allSettled(contentPromises);

    // Sort by popularity/recency (you can adjust this logic)
    return results.sort((a, b) => (b.releaseInfo || '').localeCompare(a.releaseInfo || ''));
}

/**
 * Scrape content from a specific platform
 * @param {Object} platform - Platform configuration
 * @param {string} url - URL to scrape
 * @param {string} type - Content type
 * @returns {Promise<Array>} - Array of content items
 */
async function scrapePlatform(platform, url, type) {
    console.log(`Scraping ${platform.name} (${url})`);
    
    try {
        const html = await memoizedFetch(url);
        if (!html) return [];

        const $ = cheerio.load(html);
        const items = [];

        // This is a simplified example - you'll need to adjust the selectors
        // based on the actual HTML structure of each platform
        $('.content-item, .tile, .card').each((i, el) => {
            const $el = $(el);
            const title = $el.find('h3, .title, [itemprop="name"]').first().text().trim();
            const image = $el.find('img').attr('src') || $el.find('img').attr('data-src');
            const link = $el.find('a').attr('href');
            
            if (title && image) {
                items.push({
                    id: `indiaott:${platform.id}:${type}:${i}`,
                    type,
                    name: title,
                    poster: image.startsWith('http') ? image : `${platform.baseUrl}${image}`,
                    posterShape: 'poster',
                    description: $el.find('.description, .synopsis').text().trim(),
                    genres: $el.find('.genre, .categories').text().trim().split(',').map(g => g.trim()),
                    releaseInfo: $el.find('.year, .release-date').text().trim(),
                    links: link ? [{
                        url: link.startsWith('http') ? link : `${platform.baseUrl}${link}`,
                        name: `Watch on ${platform.name}`
                    }] : []
                });
            }
        });

        return items;
    } catch (error) {
        console.error(`Error scraping ${platform.name}:`, error.message);
        return [];
    }
}

module.exports = {
    scrapeContent,
    // Export for testing
    _scrapePlatform: scrapePlatform
};
