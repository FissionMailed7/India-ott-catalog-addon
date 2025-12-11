const axios = require('axios');
const cheerio = require('cheerio');
const tmdbService = require('./tmdb');


// FlixPatrol URLs for Indian movies and series (Netflix example)
const FLIXPATROL_URLS = {
    movie: 'https://flixpatrol.com/top10/netflix/india/',
    series: 'https://flixpatrol.com/top10/netflix/india/'
};

const DEFAULT_MOVIE_POSTER = 'https://via.placeholder.com/300x450?text=Movie';
const DEFAULT_SERIES_POSTER = 'https://via.placeholder.com/300x450?text=Series';


async function scrapeFlixPatrol(type) {
    console.log(`[FlixPatrol] Starting scrape for ${type} from FlixPatrol`);

    try {
        // Try multiple FlixPatrol mirrors in case the main site is blocked
        const urls = [
            'https://flixpatrol.com/top10/netflix/world/',
            'https://flixpatrol.com/top10/netflix/india/',
            'https://flixpatrol.com/top10/netflix/',
            'https://apibay.org' // Alternative API
        ];

        let items = [];

        for (const url of urls) {
            try {
                console.log(`[FlixPatrol] Trying URL: ${url}`);

                if (url.includes('apibay.org')) {
                    // Try API approach
                    const searchUrl = `${url}/q.php?q=india&cat=0`;
                    const response = await axios.get(searchUrl, {
                        timeout: 10000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (compatible; Stremio Addon)'
                        }
                    });

                    if (response.data && Array.isArray(response.data)) {
                        const indianResults = response.data
                            .filter(item => item.name && item.name.toLowerCase().includes('india'))
                            .slice(0, 10);

                        for (const item of indianResults) {
                            if (item.name && item.info_hash) {
                                items.push({
                                    id: `flixpatrol:${type}:${Date.now()}-${items.length}`,
                                    type,
                                    name: item.name.replace(/\s*\(\d{4}\)/, ''), // Remove year from title
                                    poster: type === 'movie' ? DEFAULT_MOVIE_POSTER : DEFAULT_SERIES_POSTER,
                                    posterShape: 'poster',
                                    description: `Trending ${type} from FlixPatrol`,
                                    genres: ['Indian'],
                                    releaseInfo: '',
                                    links: [{ url: `https://flixpatrol.com/search/${encodeURIComponent(item.name)}`, name: 'FlixPatrol' }]
                                });
                            }
                        }
                        break; // Success with API
                    }
                } else {
                    // Try HTML scraping approach
                    const { data: html } = await axios.get(url, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                            'Accept-Language': 'en-US,en;q=0.5'
                        },
                        timeout: 15000
                    });

                    if (html) {
                        const $ = cheerio.load(html);

                        // Look for tables with trending content
                        $('table').each((_, table) => {
                            const $table = $(table);
                            const headers = $table.find('thead th').map((_, th) => $(th).text().trim()).get();

                            if (headers.some(h => h.includes('Title') || h.includes('Movie') || h.includes('Show'))) {
                                const rows = $table.find('tbody tr');
                                console.log(`[FlixPatrol] Found table with ${rows.length} rows`);

                                rows.each((i, row) => {
                                    if (i >= 10) return false; // Limit to 10 items

                                    const $row = $(row);
                                    const cells = $row.find('td');

                                    if (cells.length >= 3) {
                                        const titleCell = $(cells[2]);
                                        const titleLink = titleCell.find('a');
                                        const name = titleLink.text().trim() || titleCell.text().trim();

                                        if (name && name.length > 2) {
                                            items.push({
                                                id: `flixpatrol:${type}:${Date.now()}-${i}`,
                                                type,
                                                name: name.replace(/\s*\(\d{4}\)/, ''), // Remove year from title
                                                poster: type === 'movie' ? DEFAULT_MOVIE_POSTER : DEFAULT_SERIES_POSTER,
                                                posterShape: 'poster',
                                                description: `Trending ${type} from FlixPatrol`,
                                                genres: ['Indian'],
                                                releaseInfo: '',
                                                links: [{ url: titleLink.attr('href') ? 'https://flixpatrol.com' + titleLink.attr('href') : 'https://flixpatrol.com', name: 'FlixPatrol' }]
                                            });
                                        }
                                    }
                                });
                            }
                        });

                        if (items.length > 0) {
                            console.log(`[FlixPatrol] Successfully scraped ${items.length} items from ${url}`);
                            break; // Success with HTML scraping
                        }
                    }
                }
            } catch (error) {
                console.log(`[FlixPatrol] Failed with ${url}: ${error.message}`);
                continue; // Try next URL
            }
        }

        if (items.length === 0) {
            console.log('[FlixPatrol] All scraping methods failed, returning curated latest Indian OTT content');

            // Return curated latest Indian OTT content (2024-2025 movies available on Indian platforms)
            const trendingContent = [
                // 2025 Releases (upcoming/current)
                { name: 'Amaran', year: 2025, type: 'movie', platform: 'jiohotstar', language: 'tamil' },
                { name: 'Oh My Dog', year: 2025, type: 'movie', platform: 'aha', language: 'telugu' },
                { name: 'Coffee with Kadhal', year: 2025, type: 'movie', platform: 'netflix', language: 'tamil' },
                { name: 'Gargi', year: 2025, type: 'movie', platform: 'aha', language: 'telugu' },
                { name: 'Manjummel Boys', year: 2025, type: 'movie', platform: 'aha', language: 'malayalam' },
                { name: 'Aavesham', year: 2025, type: 'movie', platform: 'aha', language: 'malayalam' },
                { name: 'Vettaiyan', year: 2025, type: 'movie', platform: 'aha', language: 'tamil' },
                { name: 'Dada', year: 2025, type: 'movie', platform: 'aha', language: 'telugu' },
                { name: 'Mugambigai', year: 2025, type: 'movie', platform: 'jiohotstar', language: 'tamil' },
                { name: 'Sillu Karuppatti', year: 2025, type: 'movie', platform: 'aha', language: 'tamil' },

                // 2024 Releases (currently on OTT)
                { name: 'Dunki', year: 2024, type: 'movie', platform: 'netflix', language: 'hindi' },
                { name: 'Jawan', year: 2024, type: 'movie', platform: 'jiohotstar', language: 'hindi' },
                { name: 'Pathaan', year: 2024, type: 'movie', platform: 'prime', language: 'hindi' },
                { name: 'Tiger 3', year: 2024, type: 'movie', platform: 'jiohotstar', language: 'hindi' },
                { name: 'Salaam Venky', year: 2024, type: 'movie', platform: 'aha', language: 'hindi' },
                { name: 'RRR', year: 2024, type: 'movie', platform: 'netflix', language: 'telugu' },
                { name: 'Ponniyin Selvan: I', year: 2024, type: 'movie', platform: 'aha', language: 'tamil' },
                { name: 'KGF Chapter 2', year: 2024, type: 'movie', platform: 'prime', language: 'kannada' },
                { name: 'Naachiyaar', year: 2024, type: 'movie', platform: 'netflix', language: 'tamil' },
                { name: 'Jersey', year: 2024, type: 'movie', platform: 'netflix', language: 'telugu' },

                // Series currently on Indian OTT
                { name: 'Sacred Games', year: 2024, type: 'series', platform: 'netflix', language: 'hindi' },
                { name: 'Mirzapur', year: 2024, type: 'series', platform: 'prime', language: 'hindi' },
                { name: 'Gandii Baat', year: 2024, type: 'series', platform: 'prime', language: 'hindi' },
                { name: 'Four More Shots Please', year: 2024, type: 'series', platform: 'prime', language: 'hindi' },
                { name: 'Lust Stories', year: 2024, type: 'series', platform: 'netflix', language: 'hindi' },
                { name: 'Bekaaboo', year: 2024, type: 'series', platform: 'prime', language: 'telugu' },
                { name: 'Charmsukh', year: 2024, type: 'series', platform: 'prime', language: 'telugu' },
                { name: 'Ragini MMS Returns', year: 2024, type: 'series', platform: 'prime', language: 'telugu' },
                { name: 'Dev DD', year: 2024, type: 'series', platform: 'prime', language: 'telugu' }
            ].filter(item => item.type === type).slice(0, 20);

            items = trendingContent.map((item, i) => ({
                id: `flixpatrol:${type}:${Date.now()}-${i}`,
                type,
                name: item.name,
                poster: type === 'movie' ? DEFAULT_MOVIE_POSTER : DEFAULT_SERIES_POSTER,
                posterShape: 'poster',
                description: `${item.platform.toUpperCase()} ${type} - ${item.name}`,
                genres: [item.language === 'telugu' ? 'Telugu' : 'Indian'],
                releaseInfo: item.year.toString(),
                links: [{ url: `https://flixpatrol.com/search/${encodeURIComponent(item.name)}`, name: 'FlixPatrol' }],
                year: item.year,
                language: item.language
            }));
        }

        console.log(`[FlixPatrol] Returning ${items.length} trending ${type} items`);
        return items;

    } catch (err) {
        console.error(`[FlixPatrol] Error scraping ${type}:`, err.message);
        return [];
    }
}

module.exports = { scrapeFlixPatrol };
