# 🚀 Bricks Attendance System - Production Deployment Guide

## Pre-Deployment Checklist

### ✅ Files Ready for Upload
- [ ] All source files (HTML, CSS, JS, server.js, etc.)
- [ ] `.htaccess` file (forces HTTPS + Node.js routing)
- [ ] **`.env.production` file (CRITICAL - contains database credentials)**
- [ ] `package.json` and `package-lock.json`
- [ ] `backend/` folder with all API routes and database files

**🚨 IMPORTANT**: The `.env.production` file is REQUIRED and contains your database credentials. Without it, you'll get "Access denied for user 'root'" errors.

### ✅ Configuration Verified
- [ ] Domain: `bricks.dcism.org`
- [ ] Port: `51250` (configured in .htaccess and .env.production)
- [ ] Database: `s24100604_bricksdb`
- [ ] HTTPS forced via .htaccess
- [ ] CORS configured for production domain

## Deployment Steps

### 1. Upload Files
1. Upload all project files to your hosting subdomain folder for `bricks.dcism.org`
2. Ensure `.htaccess` is in the root directory
3. Verify `.env.production` is uploaded (contains sensitive data)

### 2. Install Dependencies
Connect via SSH and run:
```bash
cd /path/to/your/domain/folder
npm install --production
```

### 3. Verify .env.production File
**CRITICAL**: Make sure the `.env.production` file exists and contains your database credentials:
```bash
# Check if the file exists
ls -la .env.production

# View the contents (first few lines)
head -10 .env.production
```

The file should contain:
```bash
DB_HOST=localhost
DB_USER=s24100604_bricksdb
DB_PASSWORD=bricksdatabase
DB_NAME=s24100604_bricksdb
NODE_ENV=production
PORT=51250
```

**If the file is missing, create it with the correct credentials before proceeding!**

### 4. Database Setup
If database tables don't exist, run:
```bash
node backend/database/setup-production.js
```

### 5. Start the Application
```bash
# Method 1: Direct start with explicit .env.production loading (RECOMMENDED)
node -r dotenv/config server.js dotenv_config_path=.env.production

# Method 2: Set environment variables manually then start
export NODE_ENV=production
export DB_USER=s24100604_bricksdb
export DB_PASSWORD=bricksdatabase
export DB_NAME=s24100604_bricksdb
node server.js

# Method 3: Using npm script
npm run start:prod

# Method 4: Using PM2 (recommended for production)
npm install -g pm2
pm2 start server.js --name "bricks-attendance" --env production

# Method 5: Using the provided script
chmod +x start-production.sh
./start-production.sh
```

**⚠️ Important**: If you get "Access denied for user 'root'@'localhost'" error, see `DATABASE_TROUBLESHOOTING.md`

### 6. Verify Deployment
Visit these URLs to confirm everything is working:

- **Main App**: https://bricks.dcism.org
- **API Health**: https://bricks.dcism.org/api/health
- **API Info**: https://bricks.dcism.org/api

## Production Configuration Details

### .htaccess Configuration
```apache
# Force HTTPS
RewriteEngine on
RewriteCond %{REQUEST_SCHEME} !https
RewriteRule (.*) https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]

# Node.js routing to port 51250
RewriteRule (.*) http://127.0.0.1:51250%{REQUEST_URI} [P,L]
```

### Environment Variables (.env.production)
- `PORT=51250` - Must match .htaccess
- `NODE_ENV=production`
- `FRONTEND_URL=https://bricks.dcism.org`
- Database credentials configured
- JWT secrets set for production

### Security Features Enabled
- [x] HTTPS forced via .htaccess
- [x] Helmet security headers
- [x] CORS restricted to production domain
- [x] Production-level JWT secrets
- [x] Secure database configuration

## Post-Deployment

### Monitoring
- Monitor server logs for any errors
- Check API health endpoint regularly
- Verify SSL certificate is working

### Maintenance
- Keep dependencies updated
- Monitor database performance
- Regular backups of database

### Troubleshooting
If the app doesn't start:
1. Check SSH logs: `pm2 logs bricks-attendance`
2. Verify port 51250 is available
3. Check database connection
4. Verify .htaccess syntax

## Support
For deployment issues:
1. Check the API health endpoint
2. Review server logs
3. Verify all files uploaded correctly
4. Confirm database credentials are correct

---
**🎉 Your Bricks Attendance System is ready for production!**
