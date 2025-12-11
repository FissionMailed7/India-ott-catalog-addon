const axios = require('axios');
const config = require('../config');

// Debrid service integrations
class DebridService {
    constructor() {
        this.services = {};
        this.cache = new Map();
        this.cacheDuration = 30 * 60 * 1000; // 30 minutes cache for streams

        // Initialize enabled services
        config.debrid.enabledServices.forEach(serviceName => {
            const serviceConfig = config.debrid[serviceName];
            if (serviceConfig && serviceConfig.apiKey) {
                this.services[serviceName] = serviceConfig;
            }
        });
    }

    /**
     * Search for streams across all enabled debrid services
     * @param {string} query - Search query (movie title + year)
     * @param {string} type - 'movie' or 'tv'
     * @param {number} season - Season number (for TV shows)
     * @param {number} episode - Episode number (for TV shows)
     * @returns {Promise<Array>} - Array of stream objects
     */
    async searchStreams(query, type = 'movie', season = null, episode = null) {
        const cacheKey = `${query}-${type}-${season || ''}-${episode || ''}`;
        const cached = this.cache.get(cacheKey);

        if (cached && (Date.now() - cached.timestamp) < this.cacheDuration) {
            console.log(`[Debrid] Serving cached streams for "${query}"`);
            return cached.streams;
        }

        const allStreams = [];
        const promises = [];

        // Search across all enabled services
        for (const [serviceName, serviceConfig] of Object.entries(this.services)) {
            promises.push(
                this.searchService(serviceName, serviceConfig, query, type, season, episode)
                    .then(streams => {
                        console.log(`[Debrid] Found ${streams.length} streams from ${serviceName}`);
                        allStreams.push(...streams);
                    })
                    .catch(error => {
                        console.error(`[Debrid] Error searching ${serviceName}:`, error.message);
                    })
            );
        }

        await Promise.allSettled(promises);

        // If no streams found from debrid services, try torrent search as fallback
        if (allStreams.length === 0) {
            console.log(`[Debrid] No streams from debrid services, trying torrent search fallback`);
            try {
                const torrentStreams = await this.searchTorrents(query, type, season, episode);
                allStreams.push(...torrentStreams);
            } catch (error) {
                console.error(`[Debrid] Torrent fallback failed:`, error.message);
            }
        }

        // Remove duplicates by URL
        const uniqueStreams = this.deduplicateStreams(allStreams);

        // Cache the results
        this.cache.set(cacheKey, {
            streams: uniqueStreams,
            timestamp: Date.now()
        });

        console.log(`[Debrid] Total unique streams found: ${uniqueStreams.length}`);
        return uniqueStreams;
    }

    /**
     * Search a specific debrid service
     * @param {string} serviceName - Name of the service
     * @param {Object} serviceConfig - Service configuration
     * @param {string} query - Search query
     * @param {string} type - Content type
     * @param {number} season - Season number
     * @param {number} episode - Episode number
     * @returns {Promise<Array>} - Array of streams from this service
     */
    async searchService(serviceName, serviceConfig, query, type, season, episode) {
        switch (serviceName) {
            case 'realDebrid':
                return this.searchRealDebrid(serviceConfig, query, type, season, episode);
            case 'torbox':
                return this.searchTorbox(serviceConfig, query, type, season, episode);
            case 'allDebrid':
                return this.searchAllDebrid(serviceConfig, query, type, season, episode);
            case 'premiumize':
                return this.searchPremiumize(serviceConfig, query, type, season, episode);
            default:
                return [];
        }
    }

    /**
     * Search Real Debrid
     */
    async searchRealDebrid(config, query, type, season, episode) {
        if (!config.apiKey) {
            console.log('[RealDebrid] No API key configured, skipping');
            return [];
        }

        try {
            // First search for torrents
            const searchUrl = `${config.baseUrl}/torrents`;
            const searchParams = {
                query: query,
                limit: 20
            };

            const response = await axios.get(searchUrl, {
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`
                },
                params: searchParams
            });

            const streams = [];
            const torrents = response.data || [];

            for (const torrent of torrents.slice(0, 5)) { // Limit to top 5 results
                try {
                    // Get torrent info
                    const infoUrl = `${config.baseUrl}/torrents/info/${torrent.id}`;
                    const infoResponse = await axios.get(infoUrl, {
                        headers: {
                            'Authorization': `Bearer ${config.apiKey}`
                        }
                    });

                    const files = infoResponse.data.files || [];

                    for (const file of files) {
                        if (this.isVideoFile(file.path)) {
                            // Check if it's the right season/episode for TV shows
                            if (type === 'series' && !this.matchesEpisode(file.path, season, episode)) {
                                continue;
                            }

                            // Get streaming link
                            const linksUrl = `${config.baseUrl}/torrents/selectFiles/${torrent.id}`;
                            await axios.post(linksUrl, {
                                files: [file.id]
                            }, {
                                headers: {
                                    'Authorization': `Bearer ${config.apiKey}`,
                                    'Content-Type': 'application/json'
                                }
                            });

                            // Get unrestricted link
                            const unrestrictedUrl = `${config.baseUrl}/unrestrict/link`;
                            const unrestrictedResponse = await axios.post(unrestrictedUrl, {
                                link: file.download
                            }, {
                                headers: {
                                    'Authorization': `Bearer ${config.apiKey}`,
                                    'Content-Type': 'application/json'
                                }
                            });

                            if (unrestrictedResponse.data && unrestrictedResponse.data.download) {
                                streams.push({
                                    url: unrestrictedResponse.data.download,
                                    title: `Real Debrid - ${file.path.split('/').pop()}`,
                                    behaviorHints: {
                                        bingeGroup: `realdebrid-${torrent.id}`,
                                        filename: file.path.split('/').pop()
                                    }
                                });
                            }
                        }
                    }
                } catch (error) {
                    console.error(`[RealDebrid] Error processing torrent ${torrent.id}:`, error.message);
                }
            }

            return streams;
        } catch (error) {
            console.error('[RealDebrid] Search error:', error.message);
            return [];
        }
    }

    /**
     * Search Torbox
     */
    async searchTorbox(config, query, type, season, episode) {
        try {
            const searchUrl = `${config.baseUrl}/torrents/search`;
            const searchParams = {
                query: query,
                limit: 10
            };

            const response = await axios.get(searchUrl, {
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`
                },
                params: searchParams
            });

            const streams = [];
            const torrents = response.data?.data || [];

            for (const torrent of torrents) {
                try {
                    // Get torrent details
                    const detailsUrl = `${config.baseUrl}/torrents/createtorrent`;
                    const detailsResponse = await axios.post(detailsUrl, {
                        magnet: torrent.magnet
                    }, {
                        headers: {
                            'Authorization': `Bearer ${config.apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    const files = detailsResponse.data?.files || [];

                    for (const file of files) {
                        if (this.isVideoFile(file.name)) {
                            if (type === 'series' && !this.matchesEpisode(file.name, season, episode)) {
                                continue;
                            }

                            streams.push({
                                url: file.url,
                                title: `Torbox - ${file.name}`,
                                behaviorHints: {
                                    bingeGroup: `torbox-${torrent.id}`,
                                    filename: file.name
                                }
                            });
                        }
                    }
                } catch (error) {
                    console.error(`[Torbox] Error processing torrent:`, error.message);
                }
            }

            return streams;
        } catch (error) {
            console.error('[Torbox] Search error:', error.message);
            return [];
        }
    }

    /**
     * Search All Debrid
     */
    async searchAllDebrid(config, query, type, season, episode) {
        try {
            const searchUrl = `${config.baseUrl}/magnets/instant`;
            const searchParams = {
                magnets: [], // We need to provide magnet links
                agent: 'stremio-addon'
            };

            // For AllDebrid, we need to search for magnets first
            // This is a simplified implementation - in practice you'd need magnet search
            const streams = [];

            // Placeholder for magnet-based search
            // You'd typically search torrent sites for magnets, then check availability

            return streams;
        } catch (error) {
            console.error('[AllDebrid] Search error:', error.message);
            return [];
        }
    }

    /**
     * Search Premiumize
     */
    async searchPremiumize(config, query, type, season, episode) {
        try {
            const searchUrl = `${config.baseUrl}/transfer/list`;
            const searchParams = {
                include_aria2: false
            };

            // Premiumize works with direct torrent hashes or magnets
            // This is a simplified implementation
            const streams = [];

            return streams;
        } catch (error) {
            console.error('[Premiumize] Search error:', error.message);
            return [];
        }
    }

    /**
     * Check if file is a video file
     */
    isVideoFile(filename) {
        const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'];
        return videoExtensions.some(ext => filename.toLowerCase().endsWith(ext));
    }

    /**
     * Check if file matches the requested episode
     */
    matchesEpisode(filename, season, episode) {
        if (!season || !episode) return true;

        const fileLower = filename.toLowerCase();

        // Check for S01E01 format
        const sxePattern = new RegExp(`s${season.toString().padStart(2, '0')}e${episode.toString().padStart(2, '0')}`, 'i');
        if (sxePattern.test(fileLower)) return true;

        // Check for season folder structure
        const seasonPattern = new RegExp(`season\\s*${season}`, 'i');
        const episodePattern = new RegExp(`episode\\s*${episode}`, 'i');

        return seasonPattern.test(fileLower) && episodePattern.test(fileLower);
    }

    /**
     * Remove duplicate streams by URL
     */
    deduplicateStreams(streams) {
        const seen = new Set();
        return streams.filter(stream => {
            if (seen.has(stream.url)) return false;
            seen.add(stream.url);
            return true;
        });
    }

    /**
     * Search torrents as fallback when debrid services are not available
     * @param {string} query - Search query
     * @param {string} type - Content type
     * @param {number} season - Season number
     * @param {number} episode - Episode number
     * @returns {Promise<Array>} - Array of torrent streams
     */
    async searchTorrents(query, type, season, episode) {
        const streams = [];

        try {
            // Search The Pirate Bay (using their API or scraping)
            const pirateBayStreams = await this.searchPirateBay(query, type, season, episode);
            streams.push(...pirateBayStreams);

            // You could add more torrent sources here:
            // - 1337x
            // - RARBG
            // - Torrentz2
            // - etc.

        } catch (error) {
            console.error('[Torrent] Search error:', error.message);
        }

        return streams.slice(0, 10); // Limit to 10 results
    }

    /**
     * Search The Pirate Bay for torrents
     */
    async searchPirateBay(query, type, season, episode) {
        try {
            // Using a Pirate Bay proxy API (these change frequently)
            // In production, you'd want more reliable APIs or multiple proxies
            const baseUrls = [
                'https://apibay.org',
                'https://thepiratebay.org/api'
            ];

            let results = [];
            for (const baseUrl of baseUrls) {
                try {
                    const searchQuery = encodeURIComponent(query);
                    const url = `${baseUrl}/q.php?q=${searchQuery}&cat=0`;

                    const response = await axios.get(url, {
                        timeout: 5000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (compatible; Stremio Addon)'
                        }
                    });

                    if (response.data && Array.isArray(response.data)) {
                        results = response.data;
                        break;
                    }
                } catch (error) {
                    continue; // Try next proxy
                }
            }

            const streams = [];

            for (const torrent of results.slice(0, 5)) { // Limit to 5 results
                if (torrent.info_hash && torrent.name) {
                    // Create magnet link
                    const magnetLink = `magnet:?xt=urn:btih:${torrent.info_hash}&dn=${encodeURIComponent(torrent.name)}`;

                    // Check if it's relevant for the content type
                    let isRelevant = true;
                    if (type === 'series' && season && episode) {
                        const nameLower = torrent.name.toLowerCase();
                        // Basic check for season/episode in torrent name
                        isRelevant = nameLower.includes(`s${season.toString().padStart(2, '0')}`) ||
                                   nameLower.includes(`season ${season}`);
                    }

                    if (isRelevant) {
                        streams.push({
                            url: magnetLink,
                            title: `Torrent - ${torrent.name}`,
                            behaviorHints: {
                                bingeGroup: `torrent-${torrent.info_hash}`,
                                filename: torrent.name
                            },
                            infoHash: torrent.info_hash,
                            fileIdx: 0 // Assume first file is the main video
                        });
                    }
                }
            }

            return streams;
        } catch (error) {
            console.error('[PirateBay] Search error:', error.message);
            return [];
        }
    }

    /**
     * Get service status
     */
    getStatus() {
        const status = {};
        for (const serviceName of config.debrid.enabledServices) {
            status[serviceName] = {
                enabled: !!this.services[serviceName],
                configured: !!(config.debrid[serviceName] && config.debrid[serviceName].apiKey)
            };
        }
        return status;
    }
}

module.exports = new DebridService();
