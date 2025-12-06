# India OTT Catalog - Stremio Addon

A free, open-source Stremio addon that aggregates and displays curated OTT content catalogs from major Indian streaming platforms, including South Indian movies and Aha OTT.

## Features

- Aggregates content from multiple Indian OTT platforms
- Includes South Indian movies and shows (Telugu, Tamil, Kannada, Malayalam)
- Supports Aha OTT content (exclusive South Indian platform)
- Fast and lightweight with intelligent caching
- Categorized by genre and language
- Works seamlessly with Stremio

## Supported Platforms

- **Aha** - South Indian content (Telugu, Tamil, Kannada, Malayalam)
- **Disney+ Hotstar** - Multi-language Indian content
- **SonyLIV** - Hindi, regional language content
- **ZEE5** - Hindi and regional content
- **Sun NXT** - South Indian content

## Installation

### Prerequisites

- Node.js 14.x or higher
- npm or yarn

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/india-ott-catalog-addon.git
   cd india-ott-catalog-addon
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the addon server:
   ```bash
   npm start
   ```

4. The server will run on `http://localhost:7000`

5. In Stremio, go to **Addons** → **Install from URL** and enter:
   ```
   http://localhost:7000/manifest.json
   ```

6. You can also test the addon at:
   - Web UI: http://localhost:7000/
   - Health Check: http://localhost:7000/health
   - Manifest: http://localhost:7000/manifest.json

### Deploying to Vercel (Production)

1. **Push to GitHub** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push -u origin main
   ```

2. **Deploy to Vercel** - Choose one method:

   **Method A: Using Vercel CLI**
   ```bash
   npm install -g vercel
   vercel
   ```

   **Method B: Connect GitHub repository**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - Vercel will auto-detect the configuration
   - Click "Deploy"

3. **After Deployment**, add the addon to Stremio using your Vercel URL:
   ```
   https://your-project-name.vercel.app/manifest.json
   ```

4. Vercel will automatically rebuild on every push to your repository.

## Development

### Available Commands

```bash
npm start       # Run local development server
npm run dev     # Run with auto-reload (requires nodemon)
npm run vercel-dev  # Run Vercel's local dev environment
```

### Project Structure

```
.
├── api/
│   ├── index.js          # Vercel serverless function handler
│   └── manifest.json     # Stremio addon manifest
├── scrapers/
│   └── index.js          # Web scraping logic for OTT platforms
├── config.js             # Configuration for platforms and cache
├── local-server.js       # Local Express server for development
├── index.html            # Web UI
├── package.json
├── vercel.json           # Vercel deployment configuration
└── README.md
```

## Configuration

Edit `config.js` to customize:

- **Cache TTL** - How long to cache content (in milliseconds)
- **Platforms** - Which OTT platforms to scrape
- **Request Timeout** - Timeout for HTTP requests
- **User Agent** - User agent string for requests

Example:
```javascript
module.exports = {
    cache: {
        ttl: 6 * 60 * 60 * 1000,  // 6 hours
        max: 1000                   // Max cached items
    },
    platforms: [
        // Add or remove platforms here
    ],
    userAgent: 'Mozilla/5.0...',
    requestTimeout: 10000
};
```

## Architecture

### Vercel Deployment

- **`api/index.js`** - Serverless function that handles all requests
- **Routing** - All requests route through this single function
- **Environment** - Node 14+ on Vercel's serverless runtime
- **Performance** - Cold starts may take 1-2 seconds, then instant
- **Caching** - Uses memoization to cache content for 6 hours

### How It Works

1. Stremio sends a request to the addon
2. Vercel routes it to `api/index.js`
3. The API checks if it's a catalog, meta, or stream request
4. For catalog requests, the scraper fetches content from OTT platforms
5. Content is cached and returned to Stremio
6. Stremio displays the content in its interface

## Troubleshooting

### Local Development Issues

**Port 7000 already in use:**
```bash
# Use a different port
PORT=3000 npm start
```

**Dependencies not installed:**
```bash
npm install
```

**Nodemon not working:**
```bash
npm install -g nodemon
```

### Vercel Deployment Issues

**Build fails:**
- Check that `api/index.js` exists
- Verify `package.json` has correct dependencies
- Check Vercel logs for error messages

**Addon not working in Stremio:**
- Verify the manifest URL is correct (check Vercel domain)
- Open health check endpoint to verify server is running
- Check browser console for errors

**No content appearing:**
- This addon uses web scraping which may fail if OTT sites change
- Mock data is provided for development
- Check console logs for scraping errors

## Limitations

- **Web Scraping** - Depends on website HTML structure (may break if sites change)
- **Rate Limiting** - OTT sites may block frequent requests
- **Accuracy** - Scraped data may not be 100% accurate
- **Legal** - Scraping may violate terms of service (use responsibly)

## Contributing

Contributions are welcome! Areas for improvement:

- Better scraping selectors for each platform
- API integrations instead of web scraping
- Stream link extraction and verification
- Metadata enhancement
- Performance optimization

Please submit pull requests or create issues for bugs and feature requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

⚠️ **Important:**

- This addon is **not affiliated** with or endorsed by any OTT platform
- This is a **community project** for personal use
- Scraping may violate terms of service of some platforms
- Use responsibly and respect website policies
- The authors are not responsible for any misuse

## Resources

- [Stremio Documentation](https://stremio.github.io/stremio-addon-sdk/)
- [Stremio Add-ons](https://www.stremio.com/addons)
- [Vercel Documentation](https://vercel.com/docs)

## Support

For issues, questions, or suggestions:
- Create a GitHub Issue
- Check existing issues for solutions

---

**Last Updated:** December 2024
