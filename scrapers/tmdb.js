const axios = require('axios');
const config = require('../config');

// TMDB API service
class TMDBService {
    constructor() {
        this.apiKey = config.tmdb.apiKey;
        this.baseUrl = config.tmdb.baseUrl;
        this.imageBaseUrl = config.tmdb.imageBaseUrl;
        this.posterSize = config.tmdb.posterSize;
        this.backdropSize = config.tmdb.backdropSize;
        this.language = config.tmdb.language;
        this.region = config.tmdb.region;
    }

    /**
     * Search for movies or TV shows
     * @param {string} query - Search query
     * @param {string} type - 'movie' or 'tv'
     * @param {number} year - Optional year to filter results
     * @returns {Promise<Object|null>} - TMDB result or null
     */
    async search(query, type, year = null) {
        try {
            const params = {
                api_key: this.apiKey,
                query: query,
                language: this.language,
                region: this.region,
                page: 1
            };

            if (year) {
                params.year = year;
            }

            const endpoint = type === 'movie' ? 'search/movie' : 'search/tv';
            const response = await axios.get(`${this.baseUrl}/${endpoint}`, { params });

            if (response.data && response.data.results && response.data.results.length > 0) {
                return response.data.results[0]; // Return the first (most relevant) result
            }

            return null;
        } catch (error) {
            console.error(`[TMDB] Search error for "${query}":`, error.message);
            return null;
        }
    }

    /**
     * Get detailed information for a movie or TV show
     * @param {number} id - TMDB ID
     * @param {string} type - 'movie' or 'tv'
     * @returns {Promise<Object|null>} - Detailed TMDB data or null
     */
    async getDetails(id, type) {
        try {
            const endpoint = type === 'movie' ? `movie/${id}` : `tv/${id}`;
            const params = {
                api_key: this.apiKey,
                language: this.language,
                append_to_response: 'images,credits,videos'
            };

            const response = await axios.get(`${this.baseUrl}/${endpoint}`, { params });
            return response.data;
        } catch (error) {
            console.error(`[TMDB] Details error for ID ${id}:`, error.message);
            return null;
        }
    }

    /**
     * Get full poster URL
     * @param {string} posterPath - Poster path from TMDB
     * @returns {string|null} - Full poster URL or null
     */
    getPosterUrl(posterPath) {
        if (!posterPath) return null;
        return `${this.imageBaseUrl}/${this.posterSize}${posterPath}`;
    }

    /**
     * Get full backdrop URL
     * @param {string} backdropPath - Backdrop path from TMDB
     * @returns {string|null} - Full backdrop URL or null
     */
    getBackdropUrl(backdropPath) {
        if (!backdropPath) return null;
        return `${this.imageBaseUrl}/${this.backdropSize}${backdropPath}`;
    }

    /**
     * Convert TMDB data to Stremio-compatible format
     * @param {Object} tmdbData - TMDB API response
     * @param {string} type - 'movie' or 'series'
     * @param {string} originalTitle - Original title from scraping
     * @returns {Object} - Stremio-compatible metadata
     */
    formatForStremio(tmdbData, type, originalTitle) {
        const poster = this.getPosterUrl(tmdbData.poster_path);
        const backdrop = this.getBackdropUrl(tmdbData.backdrop_path);

        const item = {
            id: `indiaott:tmdb:${type}:${tmdbData.id}`,
            type: type,
            name: tmdbData.title || tmdbData.name || originalTitle,
            poster: poster,
            posterShape: 'poster',
            description: tmdbData.overview || `Watch ${tmdbData.title || tmdbData.name || originalTitle} on Indian OTT platforms`,
            genres: tmdbData.genres ? tmdbData.genres.map(g => g.name) : ['South Indian'],
            releaseInfo: type === 'movie'
                ? (tmdbData.release_date ? new Date(tmdbData.release_date).getFullYear().toString() : '')
                : (tmdbData.first_air_date ? new Date(tmdbData.first_air_date).getFullYear().toString() : ''),
            links: []
        };

        // Add backdrop if available
        if (backdrop) {
            item.background = backdrop;
        }

        // Add rating if available
        if (tmdbData.vote_average && tmdbData.vote_average > 0) {
            item.imdbRating = tmdbData.vote_average.toString();
        }

        // Add runtime for movies
        if (type === 'movie' && tmdbData.runtime) {
            item.runtime = `${tmdbData.runtime} min`;
        }

        // Add number of seasons for series
        if (type === 'series' && tmdbData.number_of_seasons) {
            item.releaseInfo = `${item.releaseInfo} • ${tmdbData.number_of_seasons} Season${tmdbData.number_of_seasons > 1 ? 's' : ''}`;
        }

        return item;
    }

    /**
     * Enrich content with TMDB metadata
     * @param {Array} contentItems - Array of scraped content items
     * @returns {Promise<Array>} - Array of enriched content items
     */
    async enrichContent(contentItems) {
        const enrichedItems = [];

        for (const item of contentItems) {
            try {
                let details = null;

                // If we have an IMDB ID in the id field, try to find it in TMDB
                if (item.id && item.id.startsWith('tt') && item.id.length >= 9) {
                    // Try to find TMDB movie by IMDB ID
                    try {
                        const findUrl = `https://api.themoviedb.org/3/find/${item.id}`;
                        const findParams = {
                            api_key: this.apiKey,
                            external_source: 'imdb_id'
                        };

                        const findResponse = await axios.get(findUrl, { params: findParams });
                        const findData = findResponse.data;

                        if (findData && ((item.type === 'movie' && findData.movie_results?.length > 0) ||
                                        (item.type === 'series' && findData.tv_results?.length > 0))) {
                            const results = item.type === 'movie' ? findData.movie_results : findData.tv_results;
                            details = await this.getDetails(results[0].id, item.type);
                        }
                    } catch (imdbError) {
                        console.warn(`[TMDB] Could not find TMDB data for IMDB ID ${item.id}, trying title search`);
                    }
                }

                // If IMDB lookup failed or no IMDB ID, search by title
                if (!details) {
                    // Extract year from releaseInfo if available
                    let year = item.year || null;
                    if (!year && item.releaseInfo) {
                        const yearMatch = item.releaseInfo.match(/\b(20\d{2})\b/);
                        if (yearMatch) {
                            year = parseInt(yearMatch[1]);
                        }
                    }

                    // Clean up the title for better search results
                    let cleanTitle = item.name
                        .replace(/\s*\(\d{4}\)\s*$/, '') // Remove trailing year in parentheses
                        .replace(/\s*-\s*Season\s*\d+/i, '') // Remove season info
                        .trim();

                    // Try multiple search variations
                    let tmdbResult = null;
                    const searchQueries = [
                        cleanTitle,
                        cleanTitle.replace(/[:\-]/g, ' '), // Remove colons and dashes
                        cleanTitle.split(' ').slice(0, 3).join(' '), // First 3 words only
                    ];

                    for (const query of searchQueries) {
                        tmdbResult = await this.search(query, item.type, year);
                        if (tmdbResult) break;
                    }

                    if (tmdbResult) {
                        details = await this.getDetails(tmdbResult.id, item.type);
                    }
                }

                if (details) {
                    const enrichedItem = this.formatForStremio(details, item.type, item.name);
                    // Preserve the IMDB ID for other addons to use
                    enrichedItem.id = item.id;
                    // Preserve any additional data from scraping
                    enrichedItem.links = item.links || [];
                    enrichedItem.originalId = item.originalId;
                    enrichedItems.push(enrichedItem);
                    console.log(`[TMDB] Enriched "${item.name}" with TMDB data (ID: ${enrichedItem.id})`);
                } else {
                    // Fallback to original item if TMDB fails
                    enrichedItems.push(item);
                    console.warn(`[TMDB] No TMDB data found for "${item.name}", using original data`);
                }

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 300));

            } catch (error) {
                console.error(`[TMDB] Error enriching "${item.name}":`, error.message);
                // Use original item as fallback
                enrichedItems.push(item);
            }
        }

        return enrichedItems;
    }
}

module.exports = new TMDBService();
