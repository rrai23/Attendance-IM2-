# 🚀 Bricks Attendance System - Server Daemon Management Guide

## 📋 Overview
This guide explains how to keep your Bricks Attendance System running permanently on your Debian server, even after you close your SSH terminal.

## 🎯 Problem Solved
- **Issue**: Server stops when SSH terminal closes
- **Solution**: Background daemon scripts with `nohup` and process management

## 📁 Files Created
1. `start-daemon.sh` - Start server as background daemon
2. `stop-daemon.sh` - Stop the daemon gracefully  
3. `check-daemon.sh` - Check daemon status and health
4. `restart-daemon.sh` - Restart the daemon
5. `manage-server.ps1` - Windows PowerShell remote management

## 🔧 Initial Setup (Run Once on Server)

### Step 1: Connect to your server
```bash
ssh s24100604@bricks.dcism.org
cd /data/users/s24100604/bricks.dcism.org
```

### Step 2: Make scripts executable
```bash
chmod +x start-daemon.sh stop-daemon.sh check-daemon.sh restart-daemon.sh
```

### Step 3: Test the daemon system
```bash
# Start the daemon
./start-daemon.sh

# Check status
./check-daemon.sh

# Test by closing SSH and reconnecting - server should still be running!
```

## 🎮 Daily Usage

### On the Server (via SSH):
```bash
# Start the server (runs in background)
./start-daemon.sh

# Check if it's running
./check-daemon.sh

# Stop the server
./stop-daemon.sh

# Restart the server
./restart-daemon.sh

# View live logs
tail -f production.log
```

### From Windows (without SSH):
```powershell
# Start daemon remotely
.\manage-server.ps1 start

# Check status remotely
.\manage-server.ps1 status

# Stop daemon remotely
.\manage-server.ps1 stop

# View logs remotely
.\manage-server.ps1 logs
```

## 🔍 Understanding the Process

### What `nohup` does:
- **nohup** = "no hang up" 
- Prevents process from terminating when SSH session ends
- Redirects output to a log file
- Process continues running in background

### Process Management:
- Server PID is saved to `server.pid` file
- Scripts check if process is actually running
- Graceful shutdown with fallback to force kill
- Automatic cleanup of stale PID files

## 📊 Monitoring

### Check if server is running:
```bash
# Method 1: Use our script
./check-daemon.sh

# Method 2: Check port manually
netstat -ln | grep :51250

# Method 3: Check process by PID
cat server.pid
ps -p $(cat server.pid)
```

### View logs:
```bash
# Last 20 lines
tail -20 production.log

# Live monitoring
tail -f production.log

# Search for errors
grep -i error production.log
```

## 🆘 Troubleshooting

### Server won't start:
```bash
# Check what's using port 51250
lsof -i:51250

# Kill any conflicting processes
lsof -ti:51250 | xargs kill -9

# Check logs for errors
tail production.log
```

### Server stops unexpectedly:
```bash
# Check system resources
free -h
df -h

# Check logs for crash information
tail -100 production.log | grep -i error
```

### Clean restart:
```bash
# Force stop everything
./stop-daemon.sh
lsof -ti:51250 | xargs kill -9 2>/dev/null

# Remove any stale files
rm -f server.pid

# Start fresh
./start-daemon.sh
```

## 🌐 Access Your Site
- **URL**: https://bricks.dcism.org
- **Server runs on**: Port 51250
- **Logs location**: `production.log`
- **PID file**: `server.pid`

## 🎉 Success Indicators
1. ✅ `./check-daemon.sh` shows "Status: RUNNING"
2. ✅ `netstat -ln | grep :51250` shows port listening
3. ✅ Website loads at https://bricks.dcism.org
4. ✅ Server stays running after SSH disconnect

## 📞 Quick Commands Reference
```bash
# Essential commands (run on server)
./start-daemon.sh     # Start background server
./stop-daemon.sh      # Stop server
./check-daemon.sh     # Check status
tail -f production.log # Monitor logs

# From Windows (remote management)
.\manage-server.ps1 start   # Remote start
.\manage-server.ps1 status  # Remote status check
```

## 🔒 Security Notes
- Server runs as your user account (s24100604)
- Logs contain sensitive information - protect access
- PID files help prevent multiple instances
- Process management prevents zombie processes

---

**🎯 Your server will now stay running permanently, even when you close SSH!**
