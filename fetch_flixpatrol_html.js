const axios = require('axios');
const fs = require('fs');

const url = 'https://flixpatrol.com/top10/netflix/india/';

(async () => {
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StremioAddonBot/1.0)'
      },
      timeout: 10000
    });
    fs.writeFileSync('flixpatrol_raw.html', data);
    console.log('HTML saved to flixpatrol_raw.html');
  } catch (err) {
    console.error('Error fetching FlixPatrol:', err.message);
  }
})();
