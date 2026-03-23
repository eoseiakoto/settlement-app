#!/bin/bash
# SettleOps Backend Setup Script
# Initializes Python virtual environment and installs dependencies

set -e

echo "================================================"
echo "SettleOps Backend Setup"
echo "================================================"

# Check Python version
echo "Checking Python installation..."
python3 --version

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
else
    echo "Virtual environment already exists"
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

echo ""
echo "================================================"
echo "Setup Complete!"
echo "================================================"
echo ""
echo "To start the application, run:"
echo "  source venv/bin/activate"
echo "  python app.py"
echo ""
echo "The API will be available at: http://127.0.0.1:5000"
echo "API docs: http://127.0.0.1:5000/"
echo ""
