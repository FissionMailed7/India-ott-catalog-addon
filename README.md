# India OTT Catalog - Stremio Addon

A free, open-source Stremio addon that aggregates and displays curated OTT content catalogs from major Indian streaming platforms, including South Indian movies and Aha OTT.

## Features

- Aggregates content from multiple Indian OTT platforms
- Includes South Indian movies and shows
- Supports Aha OTT content
- Auto-updated catalogs
- Categorized by genre, language, and popularity
- Fast and lightweight

## Supported Platforms

- Aha
- Disney+ Hotstar
- SonyLIV
- ZEE5
- Sun NXT

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

4. In Stremio, go to Addons and enter the following URL:
   ```
   http://localhost:7000/manifest.json
   ```

### Deploying to Vercel

1. Click the "Deploy" button below to deploy to Vercel:

   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyourusername%2Findia-ott-catalog-addon&project-name=india-ott-catalog-addon&repository-name=india-ott-catalog-addon)

2. After deployment, add the addon to Stremio using the Vercel deployment URL:
   ```
   https://your-vercel-app.vercel.app/manifest.json
   ```

## Configuration

You can configure the addon by modifying the `config.js` file. Available options include:

- Cache TTL
- List of platforms to scrape
- Request timeouts
- User agent

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This addon is not affiliated with or endorsed by any of the OTT platforms it scrapes. It is intended for personal use only.
