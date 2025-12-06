# Deployment Guide

This guide walks you through deploying the India OTT Catalog Stremio Addon to Vercel.

## Prerequisites

- GitHub account
- Vercel account (free at vercel.com)
- This repository forked/cloned to your GitHub

## Quick Start (5 minutes)

### Option 1: Deploy with Vercel Button (Easiest)

1. Go to your GitHub repository
2. Click this button in your README: [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/india-ott-catalog-addon)
3. Click "Deploy"
4. After deployment completes, your addon will be live at `https://your-project.vercel.app/manifest.json`

### Option 2: Connect GitHub Repository (Recommended)

1. Go to [vercel.com](https://vercel.com)
2. Sign in with your GitHub account
3. Click "Add New" → "Project"
4. Select your GitHub repository
5. Vercel automatically detects `vercel.json` configuration
6. Click "Deploy"
7. Done! Your addon is now live

### Option 3: Using Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Follow the prompts:
   - Link to existing project or create new
   - Accept default settings
   - Your addon deploys automatically

## After Deployment

### Add to Stremio

1. Copy your deployment URL from Vercel (e.g., `https://india-ott-catalog.vercel.app`)
2. Open Stremio
3. Go to **Addons** → **Install from URL**
4. Paste: `https://your-app.vercel.app/manifest.json`
5. Click "Install"

### Test Your Addon

- **Manifest**: `https://your-app.vercel.app/manifest.json`
- **Health**: `https://your-app.vercel.app/health`
- **Web UI**: `https://your-app.vercel.app/`

## Production Considerations

### Environment Variables

Currently, the addon doesn't use environment variables. If you need to add them:

1. In Vercel dashboard, go to Settings → Environment Variables
2. Add variables (e.g., API keys)
3. Update code to use `process.env.VARIABLE_NAME`

### Monitoring

Vercel provides automatic logging:

1. Go to your project in Vercel
2. View "Logs" to see recent requests
3. Check "Deployments" for build history

### Custom Domain

1. In Vercel, go to Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update addon URL in Stremio

## Updating Your Addon

### Automatic Deployments

Every push to your main branch automatically redeploys:

```bash
git add .
git commit -m "Update content sources"
git push origin main
```

Wait 1-2 minutes for Vercel to build and deploy.

### Manual Redeployment

In Vercel dashboard:
1. Go to Deployments
2. Click on any deployment
3. Click "Redeploy"

## Troubleshooting

### Build Fails

**Check error logs:**
1. Go to Vercel → Deployments
2. Click the failed deployment
3. View build logs for error details

**Common issues:**
- Missing dependencies: Run `npm install`
- Syntax errors: Check recent code changes
- Path issues: Verify all file paths are correct

**Fix and redeploy:**
```bash
git push origin main
```

### Addon Not Working in Stremio

**Verify URL:**
- Check manifest loads: `curl https://your-app.vercel.app/manifest.json`
- Should return JSON with addon metadata

**Check health:**
- Visit: `https://your-app.vercel.app/health`
- Should return `{"status": "ok", ...}`

**Debug:**
1. Open browser console (F12)
2. Add addon URL
3. Check for error messages
4. Report issues on GitHub

### Slow Performance

**Cold starts:**
- First request after inactivity takes 1-2 seconds (normal for serverless)
- Subsequent requests are fast (<100ms)

**Optimize:**
- Vercel has caching enabled in `vercel.json`
- Content is cached for 5 minutes

### Content Not Showing

**Possible causes:**
1. OTT websites changed their HTML structure
2. Rate limiting from OTT platforms
3. Network/scraping timeout

**Check logs:**
```bash
vercel logs your-project-name
```

**Workaround:**
- Mock data shows for development
- Update CSS selectors in `scrapers/index.js`
- Contribute improved scrapers on GitHub

## Maintenance

### Regular Updates

Check for security updates:
```bash
npm audit
npm audit fix
```

Update dependencies:
```bash
npm update
```

Commit and push changes for automatic redeploy.

### Monitoring Health

Create a monitoring script in GitHub Actions (optional):

1. Create `.github/workflows/health-check.yml`
2. Schedule health checks every hour
3. Get notified if addon goes down

## Advanced Configuration

### Custom Request Headers

Edit `config.js` to modify:
- User-Agent string
- Request timeouts
- Cache duration

### Adding More Platforms

1. Add platform to `config.js` platforms array
2. Update HTML selectors in `scrapers/index.js`
3. Test locally with `npm start`
4. Commit and push to Vercel

### Performance Optimization

**Vercel recommendations:**
- Keep functions under 50MB
- Use streaming for large responses
- Implement pagination for large datasets

## Support

### Resources

- [Stremio Docs](https://stremio.github.io/stremio-addon-sdk/)
- [Vercel Docs](https://vercel.com/docs)
- [GitHub Issues](https://github.com/yourusername/india-ott-catalog-addon/issues)

### Getting Help

1. Check existing GitHub issues
2. Review logs in Vercel dashboard
3. Test locally with `npm start`
4. Create detailed bug report with logs

## Security

⚠️ **Important Security Notes:**

- Never commit API keys or secrets
- Use Vercel Environment Variables for sensitive data
- Review code before deployment
- Keep dependencies updated
- Monitor Vercel for security alerts

## Rollback

If deployment breaks:

1. In Vercel dashboard, go to Deployments
2. Find previous working deployment
3. Click "Redeploy"

Or revert in GitHub:
```bash
git revert HEAD
git push origin main
```

---

**Questions?** Create an issue on GitHub!
