#!/bin/bash

echo "🚀 Setting up Bricks Attendance System with MySQL Backend"
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "🔍 Checking system requirements..."
echo "✅ Node.js found"

# Install dependencies
echo
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Check if .env file exists
if [ ! -f .env ]; then
    echo
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo
    echo "⚠️  IMPORTANT: Please edit the .env file with your MySQL credentials"
    echo "   Default values are set for local development"
    echo
    read -p "Press Enter to continue..."
fi

echo
echo "🗄️  Setting up database..."

# Run migrations
echo "Creating database tables..."
npm run migrate

if [ $? -ne 0 ]; then
    echo "❌ Database migration failed"
    echo "Please check your MySQL connection settings in .env file"
    exit 1
fi

echo "✅ Database tables created successfully"

# Seed database with sample data
echo
echo "🌱 Seeding database with sample data..."
npm run seed

if [ $? -ne 0 ]; then
    echo "❌ Database seeding failed"
    exit 1
fi

echo "✅ Database seeded successfully"

echo
echo "🎉 Setup completed successfully!"
echo
echo "🚀 Starting the server..."
echo "   Backend will run on: http://localhost:3000"
echo "   Frontend files served from root directory"
echo
echo "Press Ctrl+C to stop the server"
echo

# Start the server
npm start
