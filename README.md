# Bricks Attendance System

A comprehensive employee attendance management system with Node.js Express backend and MySQL database integration.

## 🚀 Quick Start

### Option 1: Full Setup with MySQL Backend (Recommended)

**For Windows:**
```bash
setup.bat
```

**For Linux/Mac:**
```bash
chmod +x setup.sh
./setup.sh
```

### Option 2: Local Mode (No Database Required)

If you want to test without MySQL or having database issues:

**For Windows:**
```bash
setup-local.bat
```

Then open `dashboard.html` in your browser. All data will be stored locally.

### Option 3: Test Database Connection

To diagnose MySQL connection issues:
```bash
npm run test-db
```

The setup script will:
1. Install all dependencies
2. Create `.env` file from template
3. Test MySQL connection
4. Set up MySQL database and tables
5. Seed with sample data
6. Start the server

### Manual Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Attendance-IM2-
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your MySQL credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=bricks_attendance
   ```

4. **Set up database**
   ```bash
   # Create tables
   npm run migrate
   
   # Insert sample data
   npm run seed
   ```

5. **Start the server**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

## 🌐 Access the Application

- **Frontend**: http://localhost:3000
- **API Endpoints**: http://localhost:3000/api/
- **Login Credentials** (from sample data):
  - **Admin**: username: `admin`, password: `admin`
  - **Employee**: username: `employee`, password: `employee`

## 📊 Features

### Frontend Features
- **Dashboard**: Real-time attendance overview and analytics
- **Employee Management**: Add, edit, delete employees
- **Attendance Tracking**: Clock in/out, manual attendance entry
- **Analytics**: Charts and reports for attendance patterns
- **Payroll Integration**: Calculate wages and generate payroll
- **Settings**: System configuration and preferences
- **Responsive Design**: Works on desktop and mobile devices

### Backend Features
- **RESTful API**: Complete CRUD operations
- **MySQL Integration**: Persistent data storage
- **Authentication**: JWT-based user authentication
- **Data Validation**: Input validation and sanitization
- **Error Handling**: Comprehensive error responses
- **Security**: Rate limiting, CORS, Helmet.js
- **Real-time Sync**: Frontend-backend data synchronization

### Unified Data Management
- **UnifiedEmployeeManager**: Central data hub for all employee operations
- **Cross-tab Sync**: Changes sync across browser tabs
- **Fallback Support**: Works offline with localStorage backup
- **Backend Integration**: Automatic sync with MySQL database
- **Data Consistency**: Eliminates data duplication issues

## 🏗️ Architecture

### Frontend
- **Pure JavaScript**: No external frameworks
- **Modular Design**: Separate JS files for each feature
- **Unified Data Layer**: Single source of truth for all data
- **Event-driven**: Real-time updates across components
- **Responsive CSS**: Mobile-first design approach

### Backend
- **Express.js**: Web application framework
- **MySQL2**: Database driver with promises
- **bcryptjs**: Password hashing
- **jsonwebtoken**: JWT authentication
- **Helmet.js**: Security middleware
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: API protection

### Database Schema
- **employees**: Employee information and credentials
- **attendance_records**: Daily attendance tracking
- **payroll_records**: Payroll calculations and history

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Employees
- `GET /api/employees` - Get all employees
- `POST /api/employees` - Create new employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance/clock` - Clock in/out
- `POST /api/attendance` - Create attendance record
- `PUT /api/attendance/:id` - Update attendance record

### Unified Data (Frontend-Backend Sync)
- `GET /api/unified/data` - Get all data for frontend
- `POST /api/unified/sync` - Sync frontend data to backend
- `POST /api/unified/employees` - Save employee
- `POST /api/unified/attendance` - Save attendance record

## 🔧 Development

### Scripts
```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm run migrate    # Run database migrations
npm run seed       # Seed database with sample data
npm test          # Run tests
```

### Environment Variables
```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=bricks_attendance

# Server
PORT=3000
NODE_ENV=development

# Security
JWT_SECRET=your_jwt_secret
BCRYPT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=200
```

## 📁 Project Structure

```
├── backend/
│   ├── database/
│   │   ├── connection.js    # MySQL connection setup
│   │   ├── migrate.js       # Database schema creation
│   │   └── seed.js          # Sample data insertion
│   ├── middleware/
│   │   └── auth.js          # Authentication middleware
│   └── routes/
│       ├── auth.js          # Authentication routes
│       ├── employees.js     # Employee management
│       ├── attendance.js    # Attendance tracking
│       ├── payroll.js       # Payroll operations
│       └── unified.js       # Frontend-backend sync
├── js/
│   ├── backend-api-service.js      # Backend communication
│   ├── unified-employee-manager.js # Central data management
│   ├── dashboard.js         # Dashboard functionality
│   ├── employees-page.js    # Employee management
│   └── ...                  # Other feature modules
├── css/
│   └── styles.css           # Application styles
├── mock/
│   └── data.json           # Sample data for development
├── *.html                  # Frontend pages
├── server.js               # Express server entry point
├── package.json            # Project dependencies
├── setup.bat/.sh           # Setup scripts
└── README.md               # This file
```

## 🔒 Security Features

- **Password Hashing**: bcrypt with 12 rounds
- **JWT Authentication**: Secure token-based auth
- **Rate Limiting**: Prevents API abuse
- **Input Validation**: SQL injection prevention
- **CORS Configuration**: Cross-origin security
- **Helmet.js**: Security headers

## 🚨 Troubleshooting

### Quick MySQL Connection Test
```bash
npm run test-db
```

### Common Issues

1. **Database Connection Failed (ECONNREFUSED)**
   - MySQL server not running
   - Run: `net start mysql80` (Windows) or `sudo systemctl start mysql` (Linux)
   - Check if port 3306 is blocked by firewall
   - See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed solutions

2. **Access Denied (ER_ACCESS_DENIED_ERROR)**
   - Wrong username/password in `.env` file
   - For XAMPP: usually `root` with no password
   - Test manually: `mysql -u root -p`

3. **Port Already in Use**
   - Change PORT in `.env` file
   - Kill process using port 3000: `netstat -ano | findstr :3000`

4. **Can't Setup MySQL?**
   - Use local mode: `setup-local.bat`
   - Open `dashboard.html` directly in browser
   - Works perfectly with localStorage only

5. **Frontend Not Loading Data**
   - Check browser console for errors
   - Verify backend API is running
   - Check network requests in DevTools

For detailed troubleshooting, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

### Reset Everything
```bash
# Drop and recreate database
npm run migrate
npm run seed

# Clear browser data
# Go to DevTools > Application > Storage > Clear storage
```

## 📧 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review browser console and server logs
3. Verify all environment variables are set correctly
4. Ensure all dependencies are installed

## 📄 License

MIT License - see LICENSE file for details.

---

Built with ❤️ for Bricks Company
