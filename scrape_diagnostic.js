const scrapers = require('./scrapers');

(async () => {
    console.log('Running scraper diagnostic...');

    const tests = [
        { type: 'movie', catalogId: 'indian-movies' },
        { type: 'series', catalogId: 'indian-series' }
    ];

    for (const t of tests) {
        console.log(`\n=== ${t.type.toUpperCase()} (${t.catalogId}) ===`);
        try {
            const items = await scrapers.scrapeContent(t.type, t.catalogId);
            console.log(`Total items returned: ${items.length}`);
            if (items.length > 0) {
                console.log('Sample items (up to 10):');
                items.slice(0, 10).forEach((it, i) => {
                    console.log(`#${i + 1} id:${it.id} name:"${it.name}" poster:${it.poster ? it.poster : 'none'} links:${(it.links || []).length} release:${it.releaseInfo || 'n/a'}`);
                });
            } else {
                console.log('No items returned (empty array).');
            }
        } catch (err) {
            console.error(`Error running scrapeContent for ${t.type}:`, err && err.message ? err.message : err);
        }
    }

    console.log('\nDiagnostic complete.');
})();
