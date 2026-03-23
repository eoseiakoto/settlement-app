"""
SettleOps Flask API
Main application entry point for the SettleOps backend API
"""

import os
import sys
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

# Import the API routes and persistent storage
from api.routes import api, data_store, _refresh_data_store
from storage import get_store


def create_app(config=None):
    """
    Application factory function to create and configure the Flask app.

    Args:
        config: Optional configuration dictionary

    Returns:
        Configured Flask application instance
    """
    # Resolve frontend dist path (don't use Flask's built-in static to avoid route conflicts)
    frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'dist'))
    app = Flask(__name__, static_folder=None)

    # Configuration
    app.config['JSON_SORT_KEYS'] = False
    app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB max upload

    if config:
        app.config.update(config)

    # Enable CORS for React frontend on port 5173
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://localhost:5000"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True
        }
    })

    # Register API blueprint
    app.register_blueprint(api)

    # Serve SPA index.html for non-API routes
    @app.route('/')
    @app.route('/<path:path>')
    def serve_spa(path=''):
        if path.startswith('api/'):
            return jsonify({'error': 'Not found'}), 404
        if os.path.isdir(frontend_dist):
            # Serve actual files (JS, CSS, images) if they exist
            file_path = os.path.join(frontend_dist, path)
            if path and os.path.isfile(file_path):
                return send_from_directory(frontend_dist, path)
            # Everything else gets index.html (React Router handles it)
            return send_from_directory(frontend_dist, 'index.html')
        return index_info()

    # Global error handlers (after SPA catch-all so API 404s still get JSON)
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'error': 'Internal server error', 'status': 500}), 500

    @app.route('/api-info', methods=['GET'])
    def index_info():
        return jsonify({
            'app': 'SettleOps',
            'version': '0.1.0',
            'description': 'Visa Settlement Operations Platform for ADB Ghana',
            'api_endpoints': {
                'upload_and_parse': {
                    'POST': '/api/upload',
                    'GET': '/api/packages',
                    'GET': '/api/packages/<id>'
                },
                'transaction_data': {
                    'GET': '/api/transactions',
                    'GET': '/api/transactions/<id>',
                    'GET': '/api/transactions/summary'
                },
                'settlement_data': {
                    'GET': '/api/settlement',
                    'GET': '/api/settlement/hierarchy',
                    'GET': '/api/settlement/interchange',
                    'GET': '/api/settlement/fees',
                    'GET': '/api/settlement/reconciliation'
                },
                'control_operations': {
                    'GET': '/api/control/batch-summary',
                    'GET': '/api/control/reconciliation',
                    'GET': '/api/control/index',
                    'GET': '/api/control/currency-rates'
                },
                'dashboard': {
                    'GET': '/api/dashboard'
                },
                'health': {
                    'GET': '/api/health'
                }
            }
        }), 200

    return app


def load_sample_data(data_dir):
    """
    Load sample data from a directory into persistent storage.
    Uses the SQLite-backed store for merge/deduplication.

    Args:
        data_dir: Path to the directory containing VSS reports

    Returns:
        Boolean indicating success
    """
    try:
        print(f"Attempting to load data from: {data_dir}")

        if not os.path.isdir(data_dir):
            print(f"Warning: Data directory not found: {data_dir}")
            return False

        # Try to import and use the parser module
        try:
            from parsers.package_parser import parse_package
            print("Parsers module found, using package_parser...")
            result = parse_package(data_dir)
            if result:
                # Ingest into persistent storage (merge + dedup)
                store = get_store()
                stats = store.ingest_package(result)
                print(f"Ingested data from {data_dir}: "
                      f"{stats['new_transactions']} new txns, "
                      f"{stats['duplicate_transactions']} duplicates skipped")
                return True
        except ImportError:
            print("Parsers module not yet available, using mock data...")
            pass

        # If parsers not available, load mock data
        load_mock_data()
        return True

    except Exception as e:
        print(f"Error loading sample data: {e}")
        return False


def load_mock_data():
    """
    Load mock data for testing when parsers aren't available.
    """
    # Sample transactions
    data_store['transactions'] = [
        {
            'id': 'TXN001',
            'type': 'sales',
            'date': '2023-03-10T10:30:00',
            'amount': 1500.00,
            'currency': 'USD',
            'merchant': 'Accra Electronics Ltd',
            'country': 'Ghana',
            'description': 'Point of sale transaction'
        },
        {
            'id': 'TXN002',
            'type': 'sales',
            'date': '2023-03-10T11:45:00',
            'amount': 850.50,
            'currency': 'USD',
            'merchant': 'Kumasi Trading Co',
            'country': 'Ghana',
            'description': 'Point of sale transaction'
        },
        {
            'id': 'TXN003',
            'type': 'cash',
            'date': '2023-03-10T14:20:00',
            'amount': 2000.00,
            'currency': 'GHS',
            'merchant': 'Takoradi Cash Advance',
            'country': 'Ghana',
            'description': 'Cash advance transaction'
        },
        {
            'id': 'TXN004',
            'type': 'reversal',
            'date': '2023-03-10T15:00:00',
            'amount': 500.00,
            'currency': 'USD',
            'merchant': 'Accra Electronics Ltd',
            'country': 'Ghana',
            'description': 'Reversal of transaction TXN001'
        }
    ]

    # Sample settlement data
    data_store['settlement'] = {
        'period': '2023-03-10',
        'currency': 'USD',
        'total_transactions': 4,
        'total_amount': 5350.50,
        'settlement_date': '2023-03-15',
        'status': 'pending',
        'breakdown': {
            'sales': 2350.50,
            'cash': 2000.00,
            'reversals': -500.00
        }
    }

    # Sample packages
    data_store['packages'] = [
        {
            'id': 'PKG001',
            'timestamp': '2023-03-10T16:00:00',
            'file_count': 8,
            'status': 'parsed',
            'reports': ['EP-746', 'EP-747', 'VSS-100-W', 'VSS-120', 'EP-210', 'EP-999'],
            'transaction_count': 4
        }
    ]

    # Sample control data
    data_store['control'] = {
        'EP-210': {
            'batch_id': 'BATCH001',
            'file_count': 8,
            'run_date': '2023-03-10',
            'status': 'completed'
        },
        'EP-999': {
            'report_index': ['EP-746', 'EP-747', 'VSS-100-W', 'VSS-120', 'EP-210', 'EP-999'],
            'total_files': 6
        }
    }

    # Sample raw reports (minimal structure)
    data_store['raw_reports'] = {
        'VSS-100-W': {'name': 'Settlement Reporting Hierarchy'},
        'VSS-120': {'name': 'Interchange Value'},
        'VSS-130': {'name': 'Reimbursement Fees'},
        'VSS-140': {'name': 'Visa Charges'},
        'VSS-210': {'name': 'Currency Conversion'},
        'VSS-900': {'name': 'Reconciliation Summary'}
    }

    print("Mock data loaded successfully")


if __name__ == '__main__':
    # Create app instance
    app = create_app()

    # Initialize persistent storage
    store = get_store()
    db_stats = store.get_stats()
    print(f"Database has {db_stats['total_transactions']} transactions, "
          f"{db_stats['total_packages']} packages, "
          f"{db_stats['total_rates']} rates")

    # Try to load sample data from March 2023 VSS_Reports directory
    # (will be skipped if already loaded — dedup handles it)
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    sample_data_dir = os.path.join(project_root, 'VSS_Reports', '310323')

    if os.path.isdir(sample_data_dir):
        load_sample_data(sample_data_dir)
    elif db_stats['total_transactions'] == 0:
        print(f"Sample data directory not found at {sample_data_dir}")
        print("No existing data in database. Loading mock data...")
        load_mock_data()

    # Refresh in-memory cache from persistent storage
    _refresh_data_store()
    txn_count = len(data_store.get('transaction_reports', {}).get('ep_705', {}).get('transactions', []))
    txn_count += len(data_store.get('transaction_reports', {}).get('ep_707', {}).get('transactions', []))
    txn_count += len(data_store.get('transaction_reports', {}).get('ep_727', {}).get('transactions', []))
    print(f"In-memory cache loaded: {txn_count} transactions ready to serve")

    # Run the application
    app.run(
        host='127.0.0.1',
        port=int(os.environ.get('PORT', 5000)),
        debug=True
    )
