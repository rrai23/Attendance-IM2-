# 🚀 Bricks Attendance System - Production Deployment Guide

## 📋 Pre-Deployment Checklist

### ✅ Server Requirements
- Node.js (v14 or higher)
- MySQL Database
- SSH Access to your hosting server
- Subdomain configured on your hosting panel

### ✅ Hosting Configuration
- **Allowed Ports**: 51250 - 51259 (we use 51250)
- **Database**: MySQL with provided credentials
- **SSL**: Enforced via .htaccess

## 🔧 Deployment Steps

### 1. Upload Files
Upload all project files to your subdomain folder on the hosting server.

### 2. Configure Environment
The system is pre-configured with your database credentials:
```
DB_HOST=localhost
DB_USER=s24100604_bricksdb
DB_PASSWORD=bricksdatabase
DB_NAME=s24100604_bricksdb
PORT=51250
```

### 3. Update Domain Settings
Edit `.env.production` and update:
```
FRONTEND_URL=https://bricks.dcism.org
```

### 4. Install Dependencies
```bash
npm install --production
```

### 5. Initialize Database
```bash
node init-production-db.js
```

### 6. Start Application
```bash
npm run deploy:production
```

## 📁 File Structure

### 🔑 Critical Files Created
- `.htaccess` - HTTPS enforcement + Node.js proxy
- `.env.production` - Production environment variables
- `deploy.js` - Deployment configuration script
- `init-production-db.js` - Database initialization

### 🌐 .htaccess Configuration
```apache
# Force HTTPS (Security)
RewriteEngine on
RewriteCond %{REQUEST_SCHEME} !https
RewriteRule (.*) https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]

# Node.js Application Proxy
RewriteRule (.*) http://127.0.0.1:51250%{REQUEST_URI} [P,L]
```

## 🔒 Security Features

### ✅ Enabled
- HTTPS enforcement via .htaccess
- Production JWT secrets
- Rate limiting (100 requests per 15 minutes)
- CORS protection
- bcrypt password hashing (12 rounds)
- Input validation and sanitization

### ✅ Database Security
- Environment-based credentials
- Connection pooling
- Parameterized queries (SQL injection protection)

## 🚀 Starting the Application

### Option 1: Direct Node.js
```bash
NODE_ENV=production node server.js
```

### Option 2: NPM Script
```bash
npm run deploy:production
```

### Option 3: Background Process
```bash
nohup npm run deploy:production > logs/app.log 2> logs/error.log &
```

## 📊 Monitoring

### Health Check Endpoint
```
GET /api/health
```

### Log Files
- `logs/app.log` - Application logs
- `logs/error.log` - Error logs

### View Logs
```bash
npm run logs        # View application logs
npm run logs:error  # View error logs
```

## 🌐 Access Points

### Frontend
```
https://yoursubdomain.yourdomain.com
```

### API Endpoints
```
https://yoursubdomain.yourdomain.com/api/health
https://yoursubdomain.yourdomain.com/api/auth
https://yoursubdomain.yourdomain.com/api/employees
https://yoursubdomain.yourdomain.com/api/attendance
https://yoursubdomain.yourdomain.com/api/payroll
```

## 👤 Default Admin Account

After database initialization:
- **Username**: admin
- **Password**: admin123
- **Role**: Administrator

⚠️ **IMPORTANT**: Change the default admin password immediately after first login!

## 🔧 Troubleshooting

### Common Issues

#### 1. Port Not Working
- Ensure port 51250 is in the allowed range (51250-51259)
- Check if .htaccess is in the correct subdomain folder

#### 2. Database Connection Failed
- Verify database credentials in `.env.production`
- Ensure database exists: `s24100604_bricksdb`

#### 3. HTTPS Redirect Loop
- Check .htaccess file placement
- Ensure hosting provider supports mod_rewrite

#### 4. 502 Bad Gateway
- Node.js application might not be running
- Check logs: `tail -f logs/error.log`

### Debug Commands
```bash
# Test database connection
node -e "require('./backend/database/connection')"

# Check if app is running
curl http://127.0.0.1:51250/api/health

# View running processes
ps aux | grep node
```

## 📞 Support

If you encounter issues:
1. Check the logs in `logs/` directory
2. Verify all environment variables are set correctly
3. Ensure database credentials are correct
4. Test database connection manually

## 🎯 Production URLs

Update these placeholders with your actual domain:
- Replace `yourdomain.com` with your actual domain
- Replace `yoursubdomain` with your chosen subdomain

The application will be accessible at:
`https://yoursubdomain.yourdomain.com`
