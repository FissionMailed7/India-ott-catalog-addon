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

// Comprehensive Indian content database with language classification
const INDIAN_CONTENT = {
    movie: [
        // Telugu Movies (Top recent)
        { name: 'RRR', year: 2022, imdb: 'tt8178634', language: 'telugu' },
        { name: 'Baahubali 2: The Conclusion', year: 2017, imdb: 'tt4849438', language: 'telugu' },
        { name: 'Baahubali: The Beginning', year: 2015, imdb: 'tt2631186', language: 'telugu' },
        { name: 'Arjun Reddy', year: 2017, imdb: 'tt7618184', language: 'telugu' },
        { name: 'Mahanati', year: 2018, imdb: 'tt7465992', language: 'telugu' },
        { name: 'Jersey', year: 2019, imdb: 'tt8948790', language: 'telugu' },
        { name: 'Oh My Dog', year: 2022, imdb: 'tt13870902', language: 'telugu' },
        { name: 'Coffee with Kadhal', year: 2022, imdb: 'tt20850406', language: 'telugu' },
        { name: 'Naachiyaar', year: 2023, imdb: 'tt27474909', language: 'telugu' },
        { name: 'Gargi', year: 2024, imdb: 'tt26437308', language: 'telugu' },
        { name: 'Amaran', year: 2024, imdb: 'tt23894662', language: 'telugu' },
        { name: 'Dada', year: 2024, imdb: 'tt23894662', language: 'telugu' },
        { name: 'Vettaiyan', year: 2024, imdb: 'tt23894662', language: 'telugu' },
        { name: 'Jawan', year: 2023, imdb: 'tt15354916', language: 'telugu' },
        { name: 'Pathaan', year: 2023, imdb: 'tt12844910', language: 'telugu' },
        { name: 'Tiger 3', year: 2023, imdb: 'tt15732324', language: 'telugu' },
        { name: 'Salaam Venky', year: 2022, imdb: 'tt13972594', language: 'telugu' },

        // Other Indian Languages (Kannada, Tamil, Malayalam, Hindi)
        { name: 'KGF Chapter 2', year: 2022, imdb: 'tt10698680', language: 'kannada' },
        { name: 'K.G.F: Chapter 1', year: 2018, imdb: 'tt7838252', language: 'kannada' },
        { name: 'Ponniyin Selvan: I', year: 2022, imdb: 'tt15097216', language: 'tamil' },
        { name: 'Asuran', year: 2019, imdb: 'tt9477520', language: 'tamil' },
        { name: 'Sillu Karuppatti', year: 2019, imdb: 'tt9378950', language: 'tamil' },
        { name: 'Manjummel Boys', year: 2024, imdb: 'tt26437308', language: 'malayalam' },
        { name: 'Aavesham', year: 2024, imdb: 'tt26660021', language: 'malayalam' },
        { name: 'Dunki', year: 2023, imdb: 'tt15428134', language: 'hindi' },
        { name: 'Bhoothakaalam', year: 2022, imdb: 'tt20850406', language: 'malayalam' },
        { name: 'Coffee with Kadhal', year: 2022, imdb: 'tt20850406', language: 'tamil' },
        { name: 'Oh My Dog', year: 2022, imdb: 'tt13870902', language: 'tamil' },
        { name: 'Naachiyaar', year: 2023, imdb: 'tt27474909', language: 'tamil' },
        { name: 'Coffee with Kadhal', year: 2022, imdb: 'tt20850406', language: 'tamil' },
        { name: 'Ponniyin Selvan: I', year: 2022, imdb: 'tt15097216', language: 'tamil' },
        { name: 'KGF Chapter 2', year: 2022, imdb: 'tt10698680', language: 'kannada' },
        { name: 'RRR', year: 2022, imdb: 'tt8178634', language: 'telugu' }
    ],
    series: [
        // Telugu Series
        { name: 'Dev DD', year: 2017, imdb: 'tt7162758', language: 'telugu' },
        { name: 'Charmsukh', year: 2019, imdb: 'tt10715678', language: 'telugu' },
        { name: 'Ragini MMS Returns', year: 2017, imdb: 'tt7157558', language: 'telugu' },
        { name: 'Bekaaboo', year: 2023, imdb: 'tt21388174', language: 'telugu' },
        { name: 'Lust Stories', year: 2018, imdb: 'tt8439854', language: 'telugu' },
        { name: 'Four More Shots Please', year: 2019, imdb: 'tt8714118', language: 'telugu' },

        // Other Indian Languages Series
        { name: 'Sacred Games', year: 2018, imdb: 'tt8068860', language: 'hindi' },
        { name: 'Mirzapur', year: 2018, imdb: 'tt6473300', language: 'hindi' },
        { name: 'Gandii Baat', year: 2018, imdb: 'tt8595332', language: 'hindi' },
        { name: 'Four More Shots Please', year: 2019, imdb: 'tt8714118', language: 'hindi' },
        { name: 'Lust Stories', year: 2018, imdb: 'tt8439854', language: 'hindi' },
        { name: 'Bekaaboo', year: 2023, imdb: 'tt21388174', language: 'hindi' },
        { name: 'Charmsukh', year: 2019, imdb: 'tt10715678', language: 'hindi' },
        { name: 'Ragini MMS Returns', year: 2017, imdb: 'tt7157558', language: 'hindi' },
        { name: 'Dev DD', year: 2017, imdb: 'tt7162758', language: 'hindi' },
        { name: 'Mirzapur', year: 2018, imdb: 'tt6473300', language: 'hindi' },
        { name: 'Sacred Games', year: 2018, imdb: 'tt8068860', language: 'hindi' },
        { name: 'Gandii Baat', year: 2018, imdb: 'tt8595332', language: 'hindi' },
        { name: 'Four More Shots Please', year: 2019, imdb: 'tt8714118', language: 'hindi' },
        { name: 'Lust Stories', year: 2018, imdb: 'tt8439854', language: 'hindi' },
        { name: 'Bekaaboo', year: 2023, imdb: 'tt21388174', language: 'hindi' },
        { name: 'Charmsukh', year: 2019, imdb: 'tt10715678', language: 'hindi' },
        { name: 'Ragini MMS Returns', year: 2017, imdb: 'tt7157558', language: 'hindi' },
        { name: 'Dev DD', year: 2017, imdb: 'tt7162758', language: 'hindi' }
    ]
};

/**
 * Get content from our comprehensive database
 * @param {string} type - Content type ('movie' or 'series')
 * @param {string} catalogId - Catalog ID (telugu-movies, telugu-series, other-indian-movies, other-indian-series)
 * @returns {Promise<Array>} - Array of content items
 */
async function scrapeContent(type, catalogId) {
    console.log(`[scrapeContent] Fetching ${type} content for catalog: ${catalogId}`);

    // Use only curated Indian OTT content - no scraping to avoid inappropriate results
    console.log(`[scrapeContent] Using curated ${catalogId} content`);

    // Get the curated trending content
    const trendingData = await getCuratedTrendingContent(type);

    // Filter content based on catalog ID
    let filteredContent = trendingData;
    if (catalogId === 'psychological-thrillers') {
        filteredContent = trendingData.filter(item => item.genre === 'psychological-thrillers');
    } else if (catalogId === 'murder-mysteries') {
        filteredContent = trendingData.filter(item => item.genre === 'murder-mysteries');
    } else if (catalogId === 'action-thrillers') {
        filteredContent = trendingData.filter(item => item.genre === 'action-thrillers');
    } else if (catalogId === 'crime-dramas') {
        filteredContent = trendingData.filter(item => item.genre === 'crime-dramas');
    } else if (catalogId === 'suspense-series') {
        filteredContent = trendingData.filter(item => item.genre === 'suspense-series');
    } else if (catalogId === 'noir-classics') {
        filteredContent = trendingData.filter(item => item.genre === 'noir-classics');
    }

    // Sort by year (newest first) and take top 20
    const results = filteredContent
        .sort((a, b) => b.year - a.year) // Newest first
        .slice(0, 20); // Top 20 items

    console.log(`[scrapeContent] Returning ${results.length} items for ${catalogId}`);

    console.log(`[scrapeContent] Returning ${results.length} ${catalogId} items`);

    // Always try to enrich with TMDB metadata for better posters and descriptions
    console.log(`[scrapeContent] Enriching ${results.length} items with TMDB metadata`);
    try {
        const enrichedResults = await tmdbService.enrichContent(results);
        console.log(`[scrapeContent] Successfully enriched content with TMDB data`);
        return enrichedResults;
    } catch (error) {
        console.error(`[scrapeContent] Error enriching content with TMDB:`, error.message);
        return results; // Return data even if TMDB fails
    }
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
                        // Use a title-based ID that other stream addons can easily parse
                        // Format: {title_clean}:{year}
                        const cleanTitle = title.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
                        const year = $el.find('.year, .release-date, [itemprop="datePublished"]').text().trim().match(/\b(20\d{2})\b/)?.[1] || '';
                        const itemId = year ? `${cleanTitle}:${year}` : cleanTitle;

                        items.push({
                            id: itemId,
                            type,
                            name: title,
                            poster: image.startsWith('http') ? image : `${platform.baseUrl}${image}`,
                            posterShape: 'poster',
                            description: $el.find('.description, .synopsis, .overview').text().trim() || `Watch ${title} on Indian OTT platforms`,
                            genres: $el.find('.genre, .categories, [itemprop="genre"]')
                                .text()
                                .trim()
                                .split(',')
                                .map(g => g.trim())
                                .filter(g => g.length > 0),
                            releaseInfo: year,
                            links: link ? [{
                                url: link.startsWith('http') ? link : `${platform.baseUrl}${link}`,
                                name: `Watch on ${platform.name}`
                            }] : [],
                            // Store original ID for reference
                            originalId: `indiaott:${platform.id}:${type}:${i}`
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

/**
 * Get curated global thriller content
 * @param {string} type - Content type ('movie' or 'series')
 * @returns {Promise<Array>} - Array of curated content items
 */
async function getCuratedTrendingContent(type) {
    // Curated collection of critically acclaimed thriller, mystery, suspense, and action content
    const curatedContent = [
        // Psychological Thrillers - Movies
        { name: 'Parasite', year: 2019, type: 'movie', genre: 'psychological-thrillers', imdb: 'tt6751668', rating: 8.5 },
        { name: 'Get Out', year: 2017, type: 'movie', genre: 'psychological-thrillers', imdb: 'tt5052448', rating: 7.8 },
        { name: 'The Silence of the Lambs', year: 1991, type: 'movie', genre: 'psychological-thrillers', imdb: 'tt0102926', rating: 8.6 },
        { name: 'Inception', year: 2010, type: 'movie', genre: 'psychological-thrillers', imdb: 'tt1375666', rating: 8.8 },
        { name: 'Shutter Island', year: 2010, type: 'movie', genre: 'psychological-thrillers', imdb: 'tt1130884', rating: 8.2 },
        { name: 'Black Swan', year: 2010, type: 'movie', genre: 'psychological-thrillers', imdb: 'tt0947798', rating: 8.0 },
        { name: 'The Prestige', year: 2006, type: 'movie', genre: 'psychological-thrillers', imdb: 'tt0482571', rating: 8.5 },
        { name: 'Memento', year: 2000, type: 'movie', genre: 'psychological-thrillers', imdb: 'tt0209144', rating: 8.4 },
        { name: 'Fight Club', year: 1999, type: 'movie', genre: 'psychological-thrillers', imdb: 'tt0137523', rating: 8.8 },
        { name: 'Gone Girl', year: 2014, type: 'movie', genre: 'psychological-thrillers', imdb: 'tt2267998', rating: 8.1 },
        { name: 'Prisoners', year: 2013, type: 'movie', genre: 'psychological-thrillers', imdb: 'tt1392214', rating: 8.1 },
        { name: 'Nightcrawler', year: 2014, type: 'movie', genre: 'psychological-thrillers', imdb: 'tt2872718', rating: 7.8 },
        { name: 'The Machinist', year: 2004, type: 'movie', genre: 'psychological-thrillers', imdb: 'tt0361862', rating: 7.7 },
        { name: 'Requiem for a Dream', year: 2000, type: 'movie', genre: 'psychological-thrillers', imdb: 'tt0180093', rating: 8.3 },
        { name: 'Donnie Darko', year: 2001, type: 'movie', genre: 'psychological-thrillers', imdb: 'tt0246578', rating: 8.0 },
        // Underrated international psychological thrillers
        { name: 'Oldboy', year: 2003, type: 'movie', genre: 'psychological-thrillers', imdb: 'tt0364569', rating: 8.4 },
        { name: 'Let the Right One In', year: 2008, type: 'movie', genre: 'psychological-thrillers', imdb: 'tt1139797', rating: 7.9 },
        { name: 'The Handmaiden', year: 2016, type: 'movie', genre: 'psychological-thrillers', imdb: 'tt4016934', rating: 8.1 },
        { name: 'Burning', year: 2018, type: 'movie', genre: 'psychological-thrillers', imdb: 'tt9075770', rating: 7.5 },
        { name: 'Under the Skin', year: 2013, type: 'movie', genre: 'psychological-thrillers', imdb: 'tt1441395', rating: 6.3 },
        { name: 'Enemy', year: 2013, type: 'movie', genre: 'psychological-thrillers', imdb: 'tt2316411', rating: 6.9 },
        { name: 'Coherence', year: 2013, type: 'movie', genre: 'psychological-thrillers', imdb: 'tt2866360', rating: 7.2 },
        { name: 'The Guest', year: 2014, type: 'movie', genre: 'psychological-thrillers', imdb: 'tt2980592', rating: 6.7 },
        { name: 'Goodnight Mommy', year: 2014, type: 'movie', genre: 'psychological-thrillers', imdb: 'tt3086442', rating: 6.7 },
        { name: 'Victoria', year: 2015, type: 'movie', genre: 'psychological-thrillers', imdb: 'tt4226388', rating: 7.6 },

        // Murder Mysteries - Movies (including underrated international gems)
        { name: 'Knives Out', year: 2019, type: 'movie', genre: 'murder-mysteries', imdb: 'tt8946378', rating: 7.9 },
        { name: 'The Girl with the Dragon Tattoo', year: 2011, type: 'movie', genre: 'murder-mysteries', imdb: 'tt1568346', rating: 7.8 },
        { name: 'The Hateful Eight', year: 2015, type: 'movie', genre: 'murder-mysteries', imdb: 'tt3460252', rating: 7.8 },
        { name: 'Sherlock Holmes', year: 2009, type: 'movie', genre: 'murder-mysteries', imdb: 'tt0988045', rating: 7.6 },
        { name: 'Murder on the Orient Express', year: 2017, type: 'movie', genre: 'murder-mysteries', imdb: 'tt3402236', rating: 6.5 },
        { name: 'The Da Vinci Code', year: 2006, type: 'movie', genre: 'murder-mysteries', imdb: 'tt0382625', rating: 6.6 },
        { name: 'Angels & Demons', year: 2009, type: 'movie', genre: 'murder-mysteries', imdb: 'tt0808151', rating: 6.7 },
        { name: 'The Woman in the Window', year: 2021, type: 'movie', genre: 'murder-mysteries', imdb: 'tt6111574', rating: 5.7 },
        { name: 'The 8th Night', year: 2021, type: 'movie', genre: 'murder-mysteries', imdb: 'tt13628788', rating: 6.2 },
        { name: 'The Dry', year: 2020, type: 'movie', genre: 'murder-mysteries', imdb: 'tt5144174', rating: 6.9 },
        // Underrated international murder mysteries
        { name: 'Marshland', year: 2014, type: 'movie', genre: 'murder-mysteries', imdb: 'tt2042456', rating: 7.3 },
        { name: 'The Invisible Guest', year: 2016, type: 'movie', genre: 'murder-mysteries', imdb: 'tt4857264', rating: 8.0 },
        { name: 'Memories of Murder', year: 2003, type: 'movie', genre: 'murder-mysteries', imdb: 'tt0353969', rating: 8.1 },
        { name: 'Joint Security Area', year: 2000, type: 'movie', genre: 'murder-mysteries', imdb: 'tt0248216', rating: 7.8 },
        { name: 'A Frozen Flower', year: 2008, type: 'movie', genre: 'murder-mysteries', imdb: 'tt1155056', rating: 7.2 },

        // Action Thrillers - Movies
        { name: 'John Wick', year: 2014, type: 'movie', genre: 'action-thrillers', imdb: 'tt2911666', rating: 7.4 },
        { name: 'Mad Max: Fury Road', year: 2015, type: 'movie', genre: 'action-thrillers', imdb: 'tt1392190', rating: 8.1 },
        { name: 'The Raid: Redemption', year: 2011, type: 'movie', genre: 'action-thrillers', imdb: 'tt1899353', rating: 7.6 },
        { name: 'Mission: Impossible - Fallout', year: 2018, type: 'movie', genre: 'action-thrillers', imdb: 'tt4912910', rating: 7.7 },
        { name: 'The Dark Knight', year: 2008, type: 'movie', genre: 'action-thrillers', imdb: 'tt0468569', rating: 9.0 },
        { name: 'Heat', year: 1995, type: 'movie', genre: 'action-thrillers', imdb: 'tt0113277', rating: 8.3 },
        { name: 'Die Hard', year: 1988, type: 'movie', genre: 'action-thrillers', imdb: 'tt0095016', rating: 8.2 },
        { name: 'Lethal Weapon', year: 1987, type: 'movie', genre: 'action-thrillers', imdb: 'tt0093409', rating: 7.6 },
        { name: 'Point Break', year: 1991, type: 'movie', genre: 'action-thrillers', imdb: 'tt0102685', rating: 7.3 },
        { name: 'Speed', year: 1994, type: 'movie', genre: 'action-thrillers', imdb: 'tt0111257', rating: 7.2 },
        // Underrated international action thrillers
        { name: 'District B13', year: 2004, type: 'movie', genre: 'action-thrillers', imdb: 'tt0414852', rating: 7.1 },
        { name: 'Banlieue 13', year: 2004, type: 'movie', genre: 'action-thrillers', imdb: 'tt0414852', rating: 7.1 },
        { name: 'The Raid 2', year: 2014, type: 'movie', genre: 'action-thrillers', imdb: 'tt2265171', rating: 8.0 },
        { name: 'Elite Squad', year: 2007, type: 'movie', genre: 'action-thrillers', imdb: 'tt0861739', rating: 8.0 },
        { name: 'Elite Squad 2', year: 2010, type: 'movie', genre: 'action-thrillers', imdb: 'tt1555149', rating: 8.1 },
        { name: 'Running Out of Time', year: 1999, type: 'movie', genre: 'action-thrillers', imdb: 'tt0196069', rating: 7.7 },
        { name: 'Infernal Affairs', year: 2002, type: 'movie', genre: 'action-thrillers', imdb: 'tt0338564', rating: 8.0 },
        { name: 'A Simple Plan', year: 1998, type: 'movie', genre: 'action-thrillers', imdb: 'tt0120324', rating: 7.5 },

        // Crime Dramas - Series
        { name: 'Breaking Bad', year: 2008, type: 'series', genre: 'crime-dramas', imdb: 'tt0903747', rating: 9.5 },
        { name: 'The Sopranos', year: 1999, type: 'series', genre: 'crime-dramas', imdb: 'tt0141842', rating: 9.2 },
        { name: 'Narcos', year: 2015, type: 'series', genre: 'crime-dramas', imdb: 'tt2707408', rating: 8.8 },
        { name: 'Ozark', year: 2017, type: 'series', genre: 'crime-dramas', imdb: 'tt2477462', rating: 8.4 },
        { name: 'Mindhunter', year: 2017, type: 'series', genre: 'crime-dramas', imdb: 'tt5290382', rating: 8.6 },
        { name: 'True Detective', year: 2014, type: 'series', genre: 'crime-dramas', imdb: 'tt2356777', rating: 8.9 },
        { name: 'Fargo', year: 2014, type: 'series', genre: 'crime-dramas', imdb: 'tt2802850', rating: 8.9 },
        { name: 'Better Call Saul', year: 2015, type: 'series', genre: 'crime-dramas', imdb: 'tt3032476', rating: 8.8 },
        { name: 'The Americans', year: 2013, type: 'series', genre: 'crime-dramas', imdb: 'tt2149175', rating: 8.4 },
        { name: 'Line of Duty', year: 2012, type: 'series', genre: 'crime-dramas', imdb: 'tt2303687', rating: 8.7 },

        // Suspense Series
        { name: 'Dark', year: 2017, type: 'series', genre: 'suspense-series', imdb: 'tt5753856', rating: 8.8 },
        { name: 'The OA', year: 2016, type: 'series', genre: 'suspense-series', imdb: 'tt4635282', rating: 7.8 },
        { name: 'Stranger Things', year: 2016, type: 'series', genre: 'suspense-series', imdb: 'tt4574334', rating: 8.7 },
        { name: 'Black Mirror', year: 2011, type: 'series', genre: 'suspense-series', imdb: 'tt2085059', rating: 8.8 },
        { name: 'Mr. Robot', year: 2015, type: 'series', genre: 'suspense-series', imdb: 'tt4158110', rating: 8.5 },
        { name: 'The Leftovers', year: 2014, type: 'series', genre: 'suspense-series', imdb: 'tt2699128', rating: 8.3 },
        { name: 'Wayward Pines', year: 2015, type: 'series', genre: 'suspense-series', imdb: 'tt2618986', rating: 7.3 },
        { name: 'The Haunting of Hill House', year: 2018, type: 'series', genre: 'suspense-series', imdb: 'tt6763664', rating: 8.6 },
        { name: 'Lupin', year: 2021, type: 'series', genre: 'suspense-series', imdb: 'tt2531336', rating: 7.5 },
        { name: 'Money Heist', year: 2017, type: 'series', genre: 'suspense-series', imdb: 'tt6468322', rating: 8.2 },

        // Film Noir Classics - Series/Movies
        { name: 'The Maltese Falcon', year: 1941, type: 'movie', genre: 'noir-classics', imdb: 'tt0033870', rating: 8.0 },
        { name: 'Double Indemnity', year: 1944, type: 'movie', genre: 'noir-classics', imdb: 'tt0036775', rating: 8.3 },
        { name: 'The Third Man', year: 1949, type: 'movie', genre: 'noir-classics', imdb: 'tt0041959', rating: 8.1 },
        { name: 'Touch of Evil', year: 1958, type: 'movie', genre: 'noir-classics', imdb: 'tt0052311', rating: 8.0 },
        { name: 'Chinatown', year: 1974, type: 'movie', genre: 'noir-classics', imdb: 'tt0071315', rating: 8.1 },
        { name: 'L.A. Confidential', year: 1997, type: 'movie', genre: 'noir-classics', imdb: 'tt0119488', rating: 8.2 },
        { name: 'The Long Goodbye', year: 1973, type: 'movie', genre: 'noir-classics', imdb: 'tt0070334', rating: 7.6 },
        { name: 'Farewell, My Lovely', year: 1975, type: 'movie', genre: 'noir-classics', imdb: 'tt0072976', rating: 7.3 },
        { name: 'The Big Sleep', year: 1946, type: 'movie', genre: 'noir-classics', imdb: 'tt0038355', rating: 7.9 },
        { name: 'Sunset Boulevard', year: 1950, type: 'movie', genre: 'noir-classics', imdb: 'tt0043014', rating: 8.4 }
    ];

    // Filter by content type and return formatted items
    const filteredContent = curatedContent.filter(item => item.type === type);

    return filteredContent.map((item, i) => ({
        id: item.imdb || `thriller-${type}-${i}`,
        type,
        name: item.name,
        poster: 'https://via.placeholder.com/300x450?text=' + encodeURIComponent(item.name),
        posterShape: 'poster',
        description: `Critically acclaimed ${type} - ${item.name} (${item.year}) - IMDb: ${item.rating}`,
        genres: ['Thriller', 'Mystery', 'Suspense', 'Action'],
        releaseInfo: item.year.toString(),
        links: [],
        year: item.year,
        genre: item.genre,
        rating: item.rating,
        imdbId: item.imdb
    }));
}

module.exports = {
    scrapeContent,
    // Export for testing
    _scrapePlatform: scrapePlatform,
    _getMockContent: () => MOCK_CONTENT
};
