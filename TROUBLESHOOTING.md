# 🔧 Troubleshooting MySQL Connection Issues

## Quick Diagnosis

Run this command to test your MySQL connection:
```bash
npm run test-db
```

## Common Error: ECONNREFUSED

**Error Message:** `Error: connect ECONNREFUSED 127.0.0.1:3306`

**Meaning:** MySQL server is not running or not accessible

### Solutions:

#### 1. Start MySQL Service

**Windows:**
```cmd
# Standard MySQL installation
net start mysql80
# or
net start mysql

# XAMPP users
# Open XAMPP Control Panel and start MySQL
```

**Linux/Mac:**
```bash
sudo systemctl start mysql
# or
brew services start mysql
```

#### 2. Check if MySQL is Running

**Windows:**
```cmd
# Check if MySQL is listening on port 3306
netstat -an | findstr 3306

# Check MySQL service status
sc query mysql80
```

**Linux/Mac:**
```bash
# Check if MySQL is running
sudo systemctl status mysql

# Check port
netstat -tlnp | grep 3306
```

#### 3. Verify Connection Settings

Check your `.env` file:
```env
DB_HOST=localhost      # Usually localhost for local setup
DB_PORT=3306          # Default MySQL port
DB_USER=root          # Your MySQL username
DB_PASSWORD=          # Your MySQL password
DB_NAME=bricks_attendance
```

#### 4. Test Manual Connection

Try connecting manually:
```bash
mysql -h localhost -u root -p
```

## Common Error: ER_ACCESS_DENIED_ERROR

**Meaning:** Wrong username or password

### Solutions:

1. **Check credentials in `.env` file**
2. **Reset MySQL root password:**
   ```bash
   # Stop MySQL
   net stop mysql80
   
   # Start MySQL without password check
   mysqld --skip-grant-tables
   
   # In another terminal
   mysql -u root
   ALTER USER 'root'@'localhost' IDENTIFIED BY 'newpassword';
   FLUSH PRIVILEGES;
   EXIT;
   ```

3. **For XAMPP users:** Usually username is `root` with no password

## Installation-Specific Solutions

### XAMPP/WAMP Users
- Use XAMPP Control Panel to start MySQL
- Default credentials: `root` / (no password)
- Make sure Apache is also running if you want phpMyAdmin

### Standard MySQL Installation
- Use MySQL Workbench to test connection
- Check Windows Services for MySQL80 service
- Default port is 3306

### MySQL in Docker
```bash
docker run --name mysql-attendance -e MYSQL_ROOT_PASSWORD=password -p 3306:3306 -d mysql:8.0
```

## Alternative: Run Without Database

If you can't get MySQL working, you can run the system in local mode:

1. **Use the local setup script:**
   ```bash
   setup-local.bat
   ```

2. **Or manually open files:**
   - Open `dashboard.html` in your browser
   - All data will be stored in localStorage
   - Works perfectly for testing and development

## Port Conflicts

If port 3306 is in use:

1. **Find what's using the port:**
   ```cmd
   netstat -ano | findstr 3306
   ```

2. **Change MySQL port:**
   - Edit MySQL config file (`my.ini` or `my.cnf`)
   - Change port to 3307 or another free port
   - Update `.env` file with new port

3. **Use different port in .env:**
   ```env
   DB_PORT=3307
   ```

## Firewall Issues

**Windows Firewall:**
1. Open Windows Defender Firewall
2. Allow MySQL through firewall
3. Add rule for port 3306

**Third-party Antivirus:**
- Some antivirus software blocks MySQL
- Add MySQL to exceptions list

## Still Having Issues?

### Quick Tests:
1. `npm run test-db` - Test database connection
2. `telnet localhost 3306` - Test if port is open
3. Check MySQL error logs in data directory

### Get Help:
1. Post the exact error message
2. Include your operating system
3. Specify MySQL installation method (XAMPP, standalone, etc.)
4. Share relevant parts of `.env` file (without passwords)

### Last Resort:
Use local mode for now:
```bash
setup-local.bat
```
Then open `dashboard.html` in your browser. The system works perfectly without a database for development and testing.
