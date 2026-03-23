#!/bin/bash
# SettleOps - Start Script
# Starts the Flask backend which also serves the React frontend
#
# Usage:
#   ./start.sh                           # Uses default data path
#   ./start.sh /path/to/VSS_Reports      # Custom data directory
#
# The app will be available at http://localhost:5000

cd "$(dirname "$0")/backend"

DATA_DIR="${1:-../../../VSS_Reports/310323}"

echo "============================================"
echo "  SettleOps - Settlement Operations Platform"
echo "  ADB - Agricultural Development Bank"
echo "============================================"
echo ""
echo "Data directory: $DATA_DIR"
echo "Starting server on http://localhost:5000"
echo ""

python app.py
