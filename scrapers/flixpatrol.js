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
    if (!url) return [];
    try {
        const { data: html } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; StremioAddonBot/1.0)'
            },
            timeout: 10000
        });
        const $ = cheerio.load(html);
        const items = [];

        // Find the correct section for movies or series
        const sectionTitle = type === 'movie' ? 'TOP 10 Movies' : 'TOP 10 TV Shows';
        $('h3').each((_, h3) => {
            if ($(h3).text().trim() === sectionTitle) {
                const table = $(h3).parent().next('table.card-table');
                table.find('tbody tr.table-group').each((i, tr) => {
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
        return items;
    } catch (err) {
        console.error(`[FlixPatrol] Error scraping ${type}:`, err.message);
        return [];
    }
}

module.exports = { scrapeFlixPatrol };
