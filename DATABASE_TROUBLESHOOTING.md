# 🔧 Database Connection Troubleshooting Guide

## ❌ Error: Access denied for user 'root'@'localhost'

This error indicates that your application is trying to connect to MySQL using the default 'root' user instead of your production database credentials.

## 🔍 Root Cause Analysis

The application is not reading your production environment variables correctly. It's falling back to default/development database settings.

## ✅ Step-by-Step Fix

### Step 1: Verify .env.production File Location
Make sure your `.env.production` file is in the **root directory** of your application:

```bash
# Check if the file exists in the correct location
ls -la /data/users/s24100604/bricks.dcism.org/.env.production

# The file should be at the same level as server.js
```

### Step 2: Verify .env.production File Contents
Check that your `.env.production` file contains the correct database credentials:

```bash
cat .env.production
```

It should contain:
```bash
# Production Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=s24100604_bricksdb
DB_PASSWORD=bricksdatabase
DB_NAME=s24100604_bricksdb

# Other configuration...
NODE_ENV=production
PORT=51250
```

### Step 3: Check File Permissions
Ensure the `.env.production` file is readable:

```bash
chmod 644 .env.production
```

### Step 4: Force Load .env.production File
Update your startup command to explicitly load the production environment file:

```bash
# Instead of just:
NODE_ENV=production node server.js

# Use this command to force load .env.production:
node -r dotenv/config server.js dotenv_config_path=.env.production
```

### Step 5: Alternative - Set Environment Variables Directly
If the .env file isn't working, set the variables directly:

```bash
export NODE_ENV=production
export DB_HOST=localhost
export DB_PORT=3306
export DB_USER=s24100604_bricksdb
export DB_PASSWORD=bricksdatabase
export DB_NAME=s24100604_bricksdb
export PORT=51250
export FRONTEND_URL=https://bricks.dcism.org
export JWT_SECRET=Br1cks@Att3nd4nc3_S3cur3_K3y_2025_Production_Deploy_R34dy!
export JWT_EXPIRES_IN=24h
export SESSION_SECRET=Br1cks_S3ss10n_S3cr3t_Pr0duct10n_2025!

node server.js
```

### Step 6: Verify Environment Variables Are Loaded
Add this debug command before starting your server:

```bash
# Create a simple test script to check environment variables
echo "console.log('NODE_ENV:', process.env.NODE_ENV);" > test-env.js
echo "console.log('DB_USER:', process.env.DB_USER);" >> test-env.js
echo "console.log('DB_HOST:', process.env.DB_HOST);" >> test-env.js
echo "require('dotenv').config({ path: '.env.production' });" >> test-env.js
echo "console.log('After dotenv - DB_USER:', process.env.DB_USER);" >> test-env.js

node test-env.js
```

## 🚀 Quick Fix Commands

### Option A: Using dotenv config path
```bash
cd /data/users/s24100604/bricks.dcism.org
node -r dotenv/config server.js dotenv_config_path=.env.production
```

### Option B: Manual environment setup
```bash
cd /data/users/s24100604/bricks.dcism.org

# Set all environment variables
export NODE_ENV=production
export DB_HOST=localhost
export DB_PORT=3306
export DB_USER=s24100604_bricksdb
export DB_PASSWORD=bricksdatabase
export DB_NAME=s24100604_bricksdb
export PORT=51250
export FRONTEND_URL=https://bricks.dcism.org
export JWT_SECRET=Br1cks@Att3nd4nc3_S3cur3_K3y_2025_Production_Deploy_R34dy!
export JWT_EXPIRES_IN=24h
export SESSION_SECRET=Br1cks_S3ss10n_S3cr3t_Pr0duct10n_2025!

# Start the server
node server.js
```

### Option C: Create a custom startup script
```bash
# Create start-with-env.sh
cat > start-with-env.sh << 'EOF'
#!/bin/bash
export NODE_ENV=production
export DB_HOST=localhost
export DB_PORT=3306
export DB_USER=s24100604_bricksdb
export DB_PASSWORD=bricksdatabase
export DB_NAME=s24100604_bricksdb
export PORT=51250
export FRONTEND_URL=https://bricks.dcism.org
export JWT_SECRET=Br1cks@Att3nd4nc3_S3cur3_K3y_2025_Production_Deploy_R34dy!
export JWT_EXPIRES_IN=24h
export SESSION_SECRET=Br1cks_S3ss10n_S3cr3t_Pr0duct10n_2025!

echo "🔧 Environment variables set"
echo "🚀 Starting Bricks Attendance System..."
node server.js
EOF

chmod +x start-with-env.sh
./start-with-env.sh
```

## 🔍 Additional Debugging

### Check Current Environment Variables
```bash
echo "Current working directory: $(pwd)"
echo "NODE_ENV: $NODE_ENV"
echo "DB_USER: $DB_USER"
echo "DB_HOST: $DB_HOST"
echo "Files in directory:"
ls -la | grep env
```

### Test Database Connection Manually
```bash
# Test if you can connect to MySQL with your credentials
mysql -h localhost -P 3306 -u s24100604_bricksdb -p s24100604_bricksdb
# Enter password: bricksdatabase
# If this works, the database credentials are correct
```

## 🎯 Most Likely Solution

Based on your error, the most likely fix is **Option A** above:

```bash
cd /data/users/s24100604/bricks.dcism.org
node -r dotenv/config server.js dotenv_config_path=.env.production
```

This explicitly tells Node.js to load the `.env.production` file before starting the server.

## ✅ Success Indicators

When it works correctly, you should see:
```
🔧 Environment: production
🌐 Using port: 51250
✅ Database connection established
🚀 Bricks Attendance System Server Started
```

Instead of the access denied error.

---

Try **Option A** first, and let me know if you need help with any of these steps!
