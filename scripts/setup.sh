#!/bin/bash

# Hosts Aggregator - Project Setup Script

echo "Setting up Hosts Aggregator project..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt "18" ]; then
    echo "Error: Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✓ Node.js version check passed"

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "Error: Failed to install backend dependencies"
    exit 1
fi
echo "✓ Backend dependencies installed"

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd ../frontend
npm install
if [ $? -ne 0 ]; then
    echo "Error: Failed to install frontend dependencies"
    exit 1
fi
echo "✓ Frontend dependencies installed"

# Set up environment files
echo "Setting up environment files..."
cd ..
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
echo "✓ Environment files created"

echo ""
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit backend/.env and frontend/.env with your configuration"
echo "2. Initialize the database: cd backend && npx prisma generate && npx prisma migrate dev"
echo "3. Start backend: cd backend && npm run dev"
echo "4. Start frontend: cd frontend && npm run dev"
echo ""
echo "Access the application at http://localhost:3000"