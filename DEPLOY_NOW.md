# 🎯 DEPLOYMENT READY - QUICK REFERENCE

## ✅ What's Been Configured

### 1. Domain & Hosting
- **Domain**: `bricks.dcism.org`
- **Port**: `51250` (within your allowed range 51250-51259)
- **SSL**: Forced HTTPS via .htaccess

### 2. Files Created/Updated
- `.htaccess` - Routes traffic to Node.js app on port 51250
- `.env.production` - Production environment variables
- `server.js` - Updated CORS for production security
- `start-production.sh/.bat` - Easy startup scripts
- `verify-deployment.js` - Post-deployment verification

### 3. Database Configuration
- **Host**: localhost
- **Database**: s24100604_bricksdb
- **User**: s24100604_bricksdb
- **Password**: bricksdatabase

## 🚀 DEPLOYMENT STEPS (Quick)

1. **Upload all files** to your `bricks.dcism.org` subdomain folder
2. **SSH into your server** and navigate to the folder
3. **Install dependencies**:
   ```bash
   npm install --production
   ```
4. **Start the application** (use the RECOMMENDED method):
   ```bash
   # RECOMMENDED: Explicit .env.production loading
   node -r dotenv/config server.js dotenv_config_path=.env.production
   
   # OR if that doesn't work, use manual environment setup:
   export NODE_ENV=production
   export DB_USER=s24100604_bricksdb
   export DB_PASSWORD=bricksdatabase
   export DB_NAME=s24100604_bricksdb
   node server.js
   ```

⚠️ **If you get database connection errors, see `DATABASE_TROUBLESHOOTING.md`**

## 🔍 VERIFICATION

After deployment, run:
```bash
node verify-deployment.js
```

Or manually check:
- https://bricks.dcism.org (main app)
- https://bricks.dcism.org/api/health (server health)

## ⚡ QUICK COMMANDS

```bash
# Install dependencies
npm install --production

# RECOMMENDED: Start with explicit .env.production loading
node -r dotenv/config server.js dotenv_config_path=.env.production

# OR: Manual environment setup if .env doesn't work
export NODE_ENV=production && export DB_USER=s24100604_bricksdb && export DB_PASSWORD=bricksdatabase && export DB_NAME=s24100604_bricksdb && node server.js

# Debug environment variables
node test-environment.js

# Verify deployment
node verify-deployment.js
```

## 🔧 TROUBLESHOOTING

If something doesn't work:
1. Check `.htaccess` is in root directory
2. Verify port 51250 is available
3. Check database connection
4. Review server logs

---
**🎉 You're ready to deploy! Good luck!**
