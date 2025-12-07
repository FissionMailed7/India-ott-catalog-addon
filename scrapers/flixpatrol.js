const axios = require('axios');
const cheerio = require('cheerio');


// FlixPatrol URLs for Indian movies and series (Netflix example)
const FLIXPATROL_URLS = {
    movie: 'https://flixpatrol.com/top10/netflix/india/',
    series: 'https://flixpatrol.com/top10/netflix/india/'
};

const DEFAULT_MOVIE_POSTER = 'https://via.placeholder.com/300x450?text=Movie';
const DEFAULT_SERIES_POSTER = 'https://via.placeholder.com/300x450?text=Series';


async function scrapeFlixPatrol(type) {
    const url = FLIXPATROL_URLS[type];
    console.log(`[FlixPatrol] Starting scrape for ${type} from ${url}`);
    if (!url) {
        console.error('[FlixPatrol] No URL defined for type:', type);
        return [];
    }
    try {
        console.log(`[FlixPatrol] Fetching URL: ${url}`);
        const { data: html } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Referer': 'https://www.google.com/'
            },
            timeout: 15000
        });
        
        if (!html) {
            console.error('[FlixPatrol] Received empty HTML response');
            return [];
        }
        const $ = cheerio.load(html);
        const items = [];

        // Find the correct section for movies or series
        const sectionTitle = type === 'movie' ? 'TOP 10 Movies' : 'TOP 10 TV Shows';
        console.log(`[FlixPatrol] Looking for section: ${sectionTitle}`);
        let sectionFound = false;
        
        $('h3').each((_, h3) => {
            const headingText = $(h3).text().trim();
            console.log(`[FlixPatrol] Found heading: ${headingText}`);
            
            if (headingText === sectionTitle) {
                sectionFound = true;
                console.log(`[FlixPatrol] Found matching section: ${sectionTitle}`);
                const table = $(h3).parent().next('table.card-table');
                
                if (table.length === 0) {
                    console.error('[FlixPatrol] No table found after section heading');
                    return false; // Break the each loop
                }
                
                const rows = table.find('tbody tr.table-group');
                console.log(`[FlixPatrol] Found ${rows.length} rows in table`);
                
                rows.each((i, tr) => {
                    const tds = $(tr).find('td');
                    const titleLink = $(tds[2]).find('a');
                    const name = titleLink.text().trim();
                    const link = 'https://flixpatrol.com' + titleLink.attr('href');
                    if (name) {
                        items.push({
                            id: `indiaott:${type}:${Date.now()}-${i}`,
                            type,
                            name,
                            poster: type === 'movie' ? DEFAULT_MOVIE_POSTER : DEFAULT_SERIES_POSTER,
                            posterShape: 'poster',
                            description: '',
                            genres: [],
                            releaseInfo: '',
                            links: [{ url: link, name: 'FlixPatrol' }]
                        });
                    }
                });
            }
        });
        if (!sectionFound) {
            console.error(`[FlixPatrol] Could not find section: ${sectionTitle}`);
            // Try to find any tables with content as a fallback
            console.log('[FlixPatrol] Attempting fallback content search...');
            $('table').each((i, table) => {
                console.log(`[FlixPatrol] Found table ${i} with ${$(table).find('tr').length} rows`);
            });
        }
        
        console.log(`[FlixPatrol] Returning ${items.length} items`);
        return items;
    } catch (err) {
        console.error(`[FlixPatrol] Error scraping ${type}:`, err.message);
        // Return mock data for testing
        console.log('[FlixPatrol] Returning mock data for testing');
        return [{
            id: `indiaott:${type}:mock-1`,
            type: type,
            name: `Test ${type === 'movie' ? 'Movie' : 'Series'} 1`,
            poster: type === 'movie' ? DEFAULT_MOVIE_POSTER : DEFAULT_SERIES_POSTER,
            posterShape: 'poster',
            description: 'This is a test item. The actual scraper failed to fetch data.',
            genres: ['Test'],
            releaseInfo: '2023',
            links: [{ url: 'https://example.com', name: 'Example' }]
        }, {
            id: `indiaott:${type}:mock-2`,
            type: type,
            name: `Test ${type === 'movie' ? 'Movie' : 'Series'} 2`,
            poster: type === 'movie' ? DEFAULT_MOVIE_POSTER : DEFAULT_SERIES_POSTER,
            posterShape: 'poster',
            description: 'Another test item to verify catalog display.',
            genres: ['Test', 'Demo'],
            releaseInfo: '2023',
            links: [{ url: 'https://example.com', name: 'Example' }]
        }];
    }
}

module.exports = { scrapeFlixPatrol };
