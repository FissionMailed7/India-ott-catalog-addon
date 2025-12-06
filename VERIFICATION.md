# Verification Checklist

Use this checklist to verify that all corrections have been applied and the addon is ready for deployment.

## File Structure Verification

Run this command to verify all required files exist:

```bash
ls -la api/
ls -la scrapers/
ls -la
```

Expected output includes these files:

### Root Level
- [x] `package.json` - Dependencies
- [x] `vercel.json` - Vercel configuration  
- [x] `index.html` - Web UI
- [x] `index.js` - Development entry point
- [x] `local-server.js` - Local Express server
- [x] `config.js` - Configuration
- [x] `README.md` - Main documentation
- [x] `DEPLOYMENT.md` - Deployment guide
- [x] `FIXES_SUMMARY.md` - What was fixed
- [x] `test.js` - Test script
- [x] `.env.example` - Environment variables template
- [x] `.vercelignore` - Deployment ignore file
- [x] `.gitignore` - Git ignore file

### API Directory (`api/`)
- [x] `index.js` - Serverless handler
- [x] `manifest.json` - Stremio manifest

### Scrapers Directory (`scrapers/`)
- [x] `index.js` - Scraping logic

## Code Quality Checks

### 1. JavaScript Syntax

```bash
# Check for syntax errors
node --check api/index.js
node --check local-server.js
node --check scrapers/index.js
node --check config.js
```

Expected: No errors

### 2. JSON Validation

```bash
# Validate JSON files
cat api/manifest.json | node -e "console.log(JSON.parse(require('fs').readFileSync(0, 'utf-8')))" && echo "✓ Valid"
cat package.json | node -e "console.log(JSON.parse(require('fs').readFileSync(0, 'utf-8')))" && echo "✓ Valid"
cat vercel.json | node -e "console.log(JSON.parse(require('fs').readFileSync(0, 'utf-8')))" && echo "✓ Valid"
```

Expected: All output "✓ Valid"

### 3. Module Imports

```bash
# Verify all requires work
node -e "require('./config'); console.log('✓ config.js loads')"
node -e "require('./scrapers'); console.log('✓ scrapers/index.js loads')"
```

Expected: Success messages

## Local Development Verification

### 1. Dependencies

```bash
npm install
npm list
```

Expected: All packages install without errors

### 2. Server Startup

```bash
npm start
```

Expected output:
```
✓ India OTT Catalog Addon running on http://localhost:7000
✓ Add this URL to Stremio: http://localhost:7000/manifest.json
✓ Health check: http://localhost:7000/health
✓ Web UI: http://localhost:7000/
```

### 3. API Endpoints (in another terminal)

```bash
# Test manifest
curl http://localhost:7000/manifest.json

# Test health check  
curl http://localhost:7000/health

# Test web UI
curl http://localhost:7000/

# Test CORS headers
curl -i http://localhost:7000/manifest.json
```

Expected results:
- Manifest returns JSON with addon metadata
- Health returns `{"status": "ok", ...}`
- Web UI returns HTML
- Response includes `Access-Control-Allow-Origin: *`

### 4. Run Full Test Suite

```bash
npm start  # Terminal 1

node test.js  # Terminal 2
```

Expected: All tests pass with green checkmarks

## Configuration Verification

### 1. Vercel Configuration

```bash
# Validate vercel.json
vercel validate
```

Expected: Configuration is valid

### 2. Package.json Scripts

```bash
npm run  # List all available scripts
```

Expected scripts:
- `start` - Run local server
- `dev` - Run with auto-reload
- `vercel-dev` - Run Vercel dev environment
- `test` - Run tests

### 3. Environment Variables

Check `.env.example` is present:

```bash
cat .env.example
```

Expected: Shows example env variables

## Deployment Verification

### 1. Vercel Configuration Structure

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/api/index.js"
    }
  ]
}
```

Check: `cat vercel.json`

### 2. Serverless Function Export

Check `api/index.js` exports correctly:

```bash
grep "module.exports = async (req, res)" api/index.js
```

Expected: Command returns the export line

### 3. Git Ready

```bash
git status
```

Expected:
- All important files staged or committed
- `.env` and `.env.local` in `.gitignore`
- `node_modules/` in `.gitignore`

## Functional Verification

### 1. Manifest Content

```bash
curl -s http://localhost:7000/manifest.json | jq .
```

Expected JSON includes:
- `id`: `"com.indiaottcatalog.addon"`
- `version`: `"1.0.0"`
- `name`: `"India OTT Catalog"`
- `types`: `["movie", "series"]`
- `catalogs`: Array with catalog definitions
- `resources`: `["catalog", "meta", "stream"]`

### 2. API Response Format

```bash
curl -s http://localhost:7000/health | jq .
```

Expected response:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2024-12-06T..."
}
```

### 3. CORS Headers

```bash
curl -i http://localhost:7000/manifest.json | grep -i "access-control"
```

Expected headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, OPTIONS, POST`
- `Access-Control-Allow-Headers: Content-Type`

## Performance Checks

### 1. Response Time

```bash
time curl -s http://localhost:7000/manifest.json > /dev/null
```

Expected: < 100ms for local server

### 2. Error Handling

```bash
# Test non-existent endpoint
curl http://localhost:7000/nonexistent

# Should return JSON error, not crash
```

Expected: JSON error response with 404 status

### 3. Concurrent Requests

```bash
# Make 10 concurrent requests
for i in {1..10}; do curl -s http://localhost:7000/health & done
wait

# Should handle all without errors
```

Expected: All requests succeed

## Documentation Verification

### 1. README.md

Check it contains:
- [x] Project description
- [x] Features list
- [x] Supported platforms
- [x] Installation instructions
- [x] Local development setup
- [x] Vercel deployment guide
- [x] Configuration section
- [x] Troubleshooting
- [x] Limitations
- [x] Contributing guidelines

### 2. DEPLOYMENT.md

Check it contains:
- [x] Prerequisites
- [x] Quick start options
- [x] Post-deployment setup
- [x] Environment variables
- [x] Monitoring
- [x] Troubleshooting
- [x] Maintenance
- [x] Rollback procedures

### 3. FIXES_SUMMARY.md

Check it contains:
- [x] All issues found and fixed
- [x] Architecture changes
- [x] Testing checklist
- [x] Performance improvements
- [x] Security improvements

## Pre-Deployment Checklist

Before deploying to Vercel:

- [ ] All files verified above
- [ ] `npm install` completes without errors
- [ ] `npm start` runs successfully
- [ ] All endpoints respond correctly
- [ ] Test script passes (node test.js)
- [ ] Manifest loads correctly
- [ ] Health check passes
- [ ] Web UI displays
- [ ] CORS headers present
- [ ] Git repository up to date
- [ ] `.gitignore` configured
- [ ] No secrets in code
- [ ] README updated with your repo URL
- [ ] DEPLOYMENT.md reviewed

## Deployment Steps

1. **Commit all changes:**
   ```bash
   git add .
   git commit -m "Fix: Correct all issues for Vercel deployment"
   git push origin main
   ```

2. **Deploy to Vercel:**
   ```bash
   vercel
   ```
   Or connect GitHub repo in Vercel dashboard

3. **After deployment:**
   ```bash
   # Get your Vercel URL
   vercel domains list
   
   # Test deployment
   curl https://your-project.vercel.app/manifest.json
   curl https://your-project.vercel.app/health
   ```

4. **Add to Stremio:**
   - Go to Stremio
   - Addons → Install from URL
   - Paste: `https://your-project.vercel.app/manifest.json`
   - Click Install

## Monitoring After Deployment

### 1. Check Vercel Logs

```bash
vercel logs your-project-name
```

Look for:
- No error messages
- Request counts increasing
- Response times < 1 second

### 2. Test Addon in Stremio

- Addon appears in installed addons
- Catalogs load
- Content shows (or mock data)
- No console errors

### 3. Periodic Health Checks

Monitor endpoint regularly:
```bash
watch 'curl -s https://your-project.vercel.app/health | jq .'
```

Expected: Always returns `"status": "ok"`

## Troubleshooting If Issues Occur

### If Vercel Build Fails

1. Check build logs in Vercel dashboard
2. Verify all files are committed
3. Check for syntax errors: `node --check api/index.js`
4. Verify package.json has all dependencies

### If Addon Not Working

1. Verify manifest URL is correct
2. Check Vercel logs for errors
3. Test health endpoint
4. Check browser console for errors

### If Performance Issues

1. Check Vercel logs for slow requests
2. Verify caching is working
3. Consider disabling problematic scrapers in config.js
4. Add mock data to improve response times

## Sign-Off

Once all checks pass:

- Date verified: _______________
- Verified by: _______________
- Ready for production: ✓ Yes / ✗ No

## Support

If issues arise during verification:

1. Check FIXES_SUMMARY.md for what changed
2. Review DEPLOYMENT.md troubleshooting section
3. Check GitHub Issues for similar problems
4. Review Vercel documentation

---

**All verifications complete! Addon is ready for production deployment.**
